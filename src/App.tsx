import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from '@tauri-apps/api/dialog';
import { Button, Form, Space, Input, Select, Spin, Modal, message, Progress } from 'antd';
import type { Response as GetApiByProjectIdResponse } from './types/getApiByProjectId';
import type { Response as GetApiInfoByApiIdResponse } from './types/getApiInfoByApiId';
import type { Response as GetApiTypeByBodyResponse } from './types/getApiTypeByBody';

type FieldType = {
  gen_type: string;
  dir_path: string;
  id: string;
  cookie: string;
  reqSchema: string;
  resSchema: string;
};

const createNestProjectApiMap = (data: Array<any>) => {
  if (data.every(item => Number.isInteger(item.key))) return data.map(item => item.key)
  return data.map(item => {
    return {
      title: item.title,
      children: item.children.map((self: any) => {
        if (!Number.isInteger(self.key)) return { title: self.title, chlidren: createNestProjectApiMap(self.children) }
        return self.key
      })
    }
  })
}

const getProjectApiTypeDirectory = (parent: string, data: Array<any>): string[] => {
  if (!data || data.every(item => Number.isInteger(item))) return []
  if (parent) {
    return data.filter(item => !Number.isInteger(item)).map(item => `${parent}/${item.title}/${getProjectApiTypeDirectory(`${parent}/${item.title}`, item.children)}`)
  }
  return data.filter(item => !Number.isInteger(item)).map(item => !`${getProjectApiTypeDirectory(item.title, item.children)}`?item.title:`${getProjectApiTypeDirectory(item.title, item.children)}`)
}


function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<FieldType>()
  const [genType, setGenType] = useState<string>()
  const [percent, setPercent] = useState<number>(0)
  const [spinning, setSpinning] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const projectAPIMap = useRef<Array<{
    title: string;
    children: number[];
  }>>()
  const projectAPIDirectory = useRef<Array<string[]>>()
  const getTypeByApiSchemaBody = useRef<{
    lang: 'ts',
    name: string,
    reqSchema: string,
    resSchema: string,
    querySchema: "{\n  \"required\": [],\n  \"title\": \"req query\",\n  \"type\": \"object\",\n  \"properties\": {}\n}"
  }>({
    lang: 'ts',
    querySchema: "{\n  \"required\": [],\n  \"title\": \"req query\",\n  \"type\": \"object\",\n  \"properties\": {}\n}",
    name: '',
    reqSchema: '',
    resSchema: ''
  })
  const apiTypeInfo = useRef<{ reqSchema: Array<string>, resSchema: Array<string> }>({ reqSchema: [], resSchema: [] })

  async function getDir() {
    const selected = await open({ directory: true, multiple: false }) as string
    form.setFieldValue('dir_path', selected)
  }

  async function getApiByProjectId() {
    const response = await invoke('get_api_by_project_id', { projectId: form.getFieldValue('id'), cookie: form.getFieldValue('cookie') }) as string
    const res = JSON.parse(response) as GetApiByProjectIdResponse
    projectAPIMap.current = createNestProjectApiMap(res.data)
    projectAPIDirectory.current = getProjectApiTypeDirectory('',projectAPIMap.current).map(item=>item.split('/,'))
    const createDirSuccess = await createNestProjectApiDirectory()
  }

  async function createNestProjectApiDirectory() {
    await invoke('create_nest_project_api_directory',{path:form.getFieldValue('dir_path'),dirPath:projectAPIDirectory.current })
  }

  async function getApiInfoByApiId() {
    setPercent(100 / 3)
    const response = await invoke('get_api_info_by_api_id', { id: form.getFieldValue('id'), cookie: form.getFieldValue('cookie') }) as string
    const res = JSON.parse(response) as GetApiInfoByApiIdResponse
    if (!Object.keys(res.data).length) return (messageApi.error("获取信息返回值data为空"), setSpinning(false))
    getTypeByApiSchemaBody.current.name = res.data.path.split('/').at(-1)!
    getTypeByApiSchemaBody.current.reqSchema = res.data.req_body_other
    if (!getTypeByApiSchemaBody.current.reqSchema) messageApi.info('此接口没有请求参数')
    getTypeByApiSchemaBody.current.resSchema = res.data.res_body
    if (!getTypeByApiSchemaBody.current.resSchema) messageApi.info('此接口没有响应参数')
    await getApiTypeByBody()
  }

  async function getApiTypeByBody() {
    setPercent((100 / 3) * 2)
    const response = await invoke('get_api_type_by_body', { ...getTypeByApiSchemaBody.current, cookie: form.getFieldValue('cookie') }) as string
    const res = JSON.parse(response) as GetApiTypeByBodyResponse
    if (!Object.keys(res.data).length) return (messageApi.error("获取接口类型返回值data为空"), setSpinning(false))
    apiTypeInfo.current.reqSchema = res.data.reqSchema
    apiTypeInfo.current.resSchema = res.data.resSchema
    await writeApiTypeIntoDirectory()
  }

  async function writeApiTypeIntoDirectory() {
    await invoke('write_api_type_into_directory', { path: form.getFieldValue('dir_path'), reqSchema: apiTypeInfo.current.reqSchema, resSchema: apiTypeInfo.current.resSchema, reqFileName: `/${form.getFieldValue('reqSchema')}`, resFileName: `/${form.getFieldValue('resSchema')}` })
    setTimeout(() => setPercent(100), 1000)
    setTimeout(() => (setSpinning(false), setPercent(0)), 2000)
    messageApi.success('执行成功！')
  }

  const exec = () => {
    setIsModalOpen(false)
    setSpinning(true)
    return genType === '0' ? getApiInfoByApiId : getApiByProjectId
  }

  const onSubmit = () => {
    form.validateFields().then(() => setIsModalOpen(true))
  }

  return (
    <div className="container">
      {contextHolder}
      {!spinning && <Form
        form={form}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        autoComplete="off"
      >
        <Form.Item label="目录">
          <Space>
            <Form.Item<FieldType>
              name="dir_path"
              rules={[{ required: true, message: '请选择目录!' }]}
              noStyle
            >
              <Input disabled style={{ width: 200 }} placeholder="请选择目录" />
            </Form.Item>
            <Button onClick={getDir}>选择目录</Button>
          </Space>
        </Form.Item>

        <Form.Item label="策略">
          <Space>
            <Form.Item<FieldType>
              name="gen_type"
              rules={[{ required: true, message: '请选择你的需求!' }]}
              noStyle
            >
              <Select
                style={{ width: 200 }}
                placeholder="选择你的需求"
                allowClear
                onSelect={(value) => setGenType(value)}
                onClear={() => setGenType('')}
              >
                <Select.Option value="0">接口级别</Select.Option>
                <Select.Option value="1">项目级别</Select.Option>
              </Select>
            </Form.Item>
          </Space>
        </Form.Item>

        {genType === '0' && <Form.Item label='接口ID'>
          <Space>
            <Form.Item<FieldType>
              name='id'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: `请输入接口ID`,
                },
              ]}
              noStyle
            >
              <Input style={{ width: 200 }} placeholder="请输入接口ID" />
            </Form.Item>
          </Space>
        </Form.Item>}

        {genType === '0' && <Form.Item label='入参类型文件名'>
          <Space>
            <Form.Item<FieldType>
              name='reqSchema'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: `请输入入参类型文件名`,
                },
              ]}
              noStyle
            >
              <Input style={{ width: 200 }} placeholder="请输入入参类型文件名" />
            </Form.Item>
          </Space>
        </Form.Item>}

        {genType === '0' && <Form.Item label='出参类型文件名'>
          <Space>
            <Form.Item<FieldType>
              name='resSchema'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: `请输入出参类型文件名`,
                },
              ]}
              noStyle
            >
              <Input style={{ width: 200 }} placeholder="请输入出参类型文件名" />
            </Form.Item>
          </Space>
        </Form.Item>}

        {genType === '1' && <Form.Item label='项目ID'>
          <Space>
            <Form.Item<FieldType>
              name='id'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: `请输入项目ID`,
                },
              ]}
              noStyle
            >
              <Input style={{ width: 200 }} placeholder="请输入项目ID" />
            </Form.Item>
          </Space>
        </Form.Item>}

        <Form.Item label="Cookie" >
          <Space>
            <Form.Item<FieldType>
              name='cookie' rules={[{ required: true, message: '请输入Cookie!' }]}
              noStyle
            >
              <Input.TextArea style={{ width: 200 }} placeholder="请输入Cookie" />
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" htmlType="submit" onClick={onSubmit}>
            开始生成
          </Button>
        </Form.Item>
      </Form>}
      <Modal centered title="执行前的提示" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => exec()()} okText='开始执行' cancelText='再确认一下' maskClosable={false}>
        <div>你选择了<span style={{ color: '#1677ff' }}>{genType === '0' ? '接口' : '项目'}级别</span>的策略</div>
        <div>你输入的<span style={{ color: '#1677ff' }}>{genType === '0' ? '接口' : '项目'}ID</span>是{form.getFieldValue('id')}</div>
        <div>你选择的存放生成类型的目录是<span style={{ color: '#1677ff' }}>{form.getFieldValue('dir_path')}</span></div>
      </Modal>
      <Spin spinning={spinning} fullscreen />
      {spinning && <Progress percent={percent} type="circle" />}
    </div>
  );
}

export default App;
