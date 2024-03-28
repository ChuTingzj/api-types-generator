import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from '@tauri-apps/api/dialog';
import { Button, Form, Space, Input, Select, Spin, Modal, message, Progress, Tree } from 'antd';
import { flatten } from './algorithm/flatten'
import { flattenStruct } from './algorithm/flattenStruct'
import { createNestProjectApiMap } from './algorithm/createNestProjectApiMap'
import { getProjectApiTypeDirectory, LeafNodeMap } from './algorithm/getProjectApiTypeDirectory'
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

type PathValueStruct = Record<string, Array<number>>
type PathInfoStruct = Record<string, Array<Record<any, any>>>

const PathValueObj: PathValueStruct = {}
const PathInfoObj: PathInfoStruct = {}

function getReqBody(obj: Record<string, unknown>) {
  return String(obj.req_body || obj.req_body_other)
}
function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, contextModalHolder] = Modal.useModal();
  const [form] = Form.useForm<FieldType>()
  const [genType, setGenType] = useState<string>()
  const [percent, setPercent] = useState<number>(0)
  const [spinning, setSpinning] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [treeEditorOpen, setTreeEditorOpen] = useState<boolean>(false)
  const [treeData, setTreeData] = useState<Array<any>>([])
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
    querySchema: string
  }>({
    lang: 'ts',
    querySchema: "{\n  \"required\": [],\n  \"title\": \"req query\",\n  \"type\": \"object\",\n  \"properties\": {}\n}",
    name: '',
    reqSchema: '',
    resSchema: ''
  })
  const apiTypeInfo = useRef<{ reqSchema: Array<string>, resSchema: Array<string>, querySchema: Array<string> }>({ reqSchema: [], resSchema: [], querySchema: [] })

  async function getDir() {
    const selected = await open({ directory: true, multiple: false }) as string
    form.setFieldValue('dir_path', selected)
  }
  async function getApiByProjectId() {
    const needCustomize = await modal.confirm({
      title: '是否自定义生成的文件名',
      okText: '是，我需要自定义',
      cancelText: '不，我不需要自定义',
      centered: true
    })
    const response = await invoke('get_api_by_project_id', { projectId: form.getFieldValue('id'), cookie: form.getFieldValue('cookie') }) as string
    const res = JSON.parse(response) as GetApiByProjectIdResponse
    if (!needCustomize) {
      setPercent(100 / 3)
      projectAPIMap.current = createNestProjectApiMap(res.data)
      projectAPIDirectory.current = getProjectApiTypeDirectory('', projectAPIMap.current).map(item => item.split('/,')).map(item => item.filter(Boolean).map(item => item.replace(/,/, '')))
      const valueMap = flatten(flattenStruct(projectAPIMap.current)).filter(item => item && Reflect.has(item, 'children') && item.children.length)
      valueMap.forEach(item => {
        const title = Reflect.get(LeafNodeMap, item.key).title
        Reflect.set(LeafNodeMap, item.key, { title, children: item.children })
      })
      Object.keys(LeafNodeMap).forEach(item => {
        Reflect.set(PathValueObj, Reflect.get(LeafNodeMap, item).title, Reflect.get(LeafNodeMap, item).children)
      })
      const createDirSuccess = await createNestProjectApiDirectory()
      if (createDirSuccess) {
        setPercent(200 / 3)
        messageApi.success('项目目录生成成功')
        Promise.all(Object.keys(PathValueObj).map(async (item) => {
          return Promise.all(Reflect.get(PathValueObj, item).map(async id => {
            return invoke('get_api_info_by_api_id', { id: String(id), cookie: form.getFieldValue('cookie') }).then(response => {
              const res = JSON.parse(response as string) as GetApiInfoByApiIdResponse
              if (!Object.keys(res.data).length) return (messageApi.error("获取信息返回值data为空"), setSpinning(false))
              if (Array.isArray(Reflect.get(PathInfoObj, item))) {
                Reflect.set(PathInfoObj, item, Reflect.get(PathInfoObj, item).concat(res.data))
              } else {
                Reflect.set(PathInfoObj, item, [res.data])
              }
              return item
            })
          })).then(result => {
            if (result.every(item => !!item)) {
              messageApi.success(`${item}目录下接口信息获取成功`)
              return result
            } else {
              messageApi.error(`${item}目录下接口信息获取失败`)
              setSpinning(false)
            }
          }).catch((reason) => (messageApi.error(reason), setSpinning(false)))
        })).then(async () => {
          const result = await Promise.all(Object.keys(PathInfoObj).map(async key => {
            return Promise.all(Reflect.get(PathInfoObj, key).map(async item => {
              const getTypeByApiSchemaBody: Record<any, any> = {
                lang: 'ts',
                querySchema: "{\n  \"required\": [],\n  \"title\": \"req query\",\n  \"type\": \"object\",\n  \"properties\": {}\n}"
              }
              const properties:Record<any,any> = {};
              const hasQueryParams = Array.isArray(item.req_query) && item.req_query.length
              if(hasQueryParams){
                item.req_query.forEach((item:any)=>{
                  Reflect.set(properties,item.name,{description:item.description,type:item.type})
                })
                hasQueryParams && (getTypeByApiSchemaBody.querySchema = JSON.stringify({
                  properties,
                  required: [],
                  title: "req query",
                  type: "object"
                }))
              }
              const apiTypeInfo: Record<any, any> = {}
              getTypeByApiSchemaBody.name = item.path.split('/').at(-1)!
              getTypeByApiSchemaBody.reqSchema = getReqBody(item) as string
              getTypeByApiSchemaBody.resSchema = item.res_body
              const response = await invoke('get_api_type_by_body', { ...getTypeByApiSchemaBody, cookie: form.getFieldValue('cookie') })
              const res = JSON.parse(response as string) as GetApiTypeByBodyResponse
              if (!Object.keys(res.data).length) return (messageApi.error("获取接口类型返回值data为空"), setSpinning(false))
              apiTypeInfo.reqSchema = res.data.reqSchema
              apiTypeInfo.resSchema = res.data.resSchema
              apiTypeInfo.querySchema = res.data.querySchema
              return await invoke('write_api_type_into_directory', { path: form.getFieldValue('dir_path'), querySchema:apiTypeInfo.querySchema,reqSchema: apiTypeInfo.reqSchema, resSchema: apiTypeInfo.resSchema, reqFileName: `/${key}/${item.title.replace(/\//, '')}Req.ts`, resFileName: `/${key}/${item.title.replace(/\//, '')}Res.ts` })
            }))
          }))
          if (result.every(Boolean)) {
            setTimeout(() => setPercent(100), 1000)
            setTimeout(() => (setSpinning(false), setPercent(0)), 2000)
            messageApi.success('类型文件生成成功！')
          }
          setTimeout(() => (setSpinning(false), setPercent(0)), 2000)
        }).catch((reason) => (messageApi.error(reason), setSpinning(false)))
      }
    } else {
      setTreeData(res.data)
      setTreeEditorOpen(true)
    }
  }

  async function createNestProjectApiDirectory() {
    return await invoke('create_nest_project_api_directory', { path: form.getFieldValue('dir_path'), dirPath: projectAPIDirectory.current })
  }

  async function getApiInfoByApiId() {
    setPercent(100 / 3)
    const response = await invoke('get_api_info_by_api_id', { id: form.getFieldValue('id'), cookie: form.getFieldValue('cookie') }) as string
    const res = JSON.parse(response) as GetApiInfoByApiIdResponse
    if (!Object.keys(res.data).length) return (messageApi.error("获取信息返回值data为空"), setSpinning(false))
    getTypeByApiSchemaBody.current.name = res.data.path.split('/').at(-1)!
    getTypeByApiSchemaBody.current.reqSchema = getReqBody(res.data) as string
    const hasQueryParams = Array.isArray(res.data.req_query) && res.data.req_query.length
    const properties:Record<any,any> = {};
    if(hasQueryParams){
      res.data.req_query.forEach(item=>{
        Reflect.set(properties,item.name,{description:item.description,type:item.type})
      })
      hasQueryParams && (getTypeByApiSchemaBody.current.querySchema = JSON.stringify({
        properties,
        required: [],
        title: "req query",
        type: "object"
      }))
    }
    if (!getTypeByApiSchemaBody.current.reqSchema && !getTypeByApiSchemaBody.current.querySchema) messageApi.info('此接口没有请求参数')
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
    apiTypeInfo.current.querySchema = res.data.querySchema
    await writeApiTypeIntoDirectory()
  }

  async function writeApiTypeIntoDirectory() {
    await invoke('write_api_type_into_directory', { path: form.getFieldValue('dir_path'), querySchema:apiTypeInfo.current.querySchema,reqSchema: apiTypeInfo.current.reqSchema, resSchema: apiTypeInfo.current.resSchema, reqFileName: `/${form.getFieldValue('reqSchema')}`, resFileName: `/${form.getFieldValue('resSchema')}` })
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
      {contextModalHolder}
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
      <Modal centered title='树形编辑器' open={treeEditorOpen} onCancel={() => setTreeEditorOpen(false)} maskClosable={false}>
        <Tree
          treeData={treeData}
        />
      </Modal>
      <Spin spinning={spinning} fullscreen />
      {spinning && <Progress percent={percent} type="circle" />}
    </div>
  );
}

export default App;
