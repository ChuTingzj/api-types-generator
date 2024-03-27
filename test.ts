const nest3json = [
    {
      "key": "a55cbd2f-7bfb-45f6-8613-47341afee937",
      "title": "评论&点赞",
      "level": 1,
      "type": 1,
      "children": [
        {
          "key": "7d53a326-3818-4ad6-8b39-dba3dbbc985e",
          "title": "api",
          "level": 2,
          "type": 1,
          "children": [
            {
              "key": "e8058853-cecf-485d-aabd-95e294eaf9ce",
              "title": "评论",
              "level": 3,
              "type": 1,
              "children": [
                {
                  "key": 404068,
                  "title": "entry评论列表",
                  "method": "GET",
                  "path": "component/comment",
                  "type": 2,
                  "children": []
                },
                {
                  "key": "f16e5fe7-c76c-4a5b-8e3d-564a2c8643cd",
                  "title": "点赞",
                  "level": 4,
                  "type": 1,
                  "children": [
                    {
                      "key": 404019,
                      "title": "评论点赞",
                      "method": "POST",
                      "path": "component/comment/:comment_id/like",
                      "type": 2,
                      "children": []
                    },
                    {
                      "key": 404033,
                      "title": "评论点赞删除",
                      "method": "DELETE",
                      "path": "component/comment/:comment_id/like",
                      "type": 2,
                      "children": []
                    }
                  ]
                },
                {
                  "key": "d793b59a-2e71-4096-9583-e96fb7007c07",
                  "title": "评论",
                  "level": 4,
                  "type": 1,
                  "children": [
                    {
                      "key": 404021,
                      "title": "添加评论",
                      "method": "POST",
                      "path": "component/comment",
                      "type": 2,
                      "children": []
                    },
                    {
                      "key": 404022,
                      "title": "评论删除",
                      "method": "DELETE",
                      "path": "component/comment/:comment_id",
                      "type": 2,
                      "children": []
                    }
                  ]
                }
              ]
            },
            {
              "key": "5c238619-79a4-471d-81ec-90edcd5d2282",
              "title": "entry",
              "level": 3,
              "type": 1,
              "children": [
                {
                  "key": "39c5bab1-0073-438b-b392-193c62b47c0c",
                  "title": "entry点赞相关",
                  "level": 4,
                  "type": 1,
                  "children": [
                    {
                      "key": 404002,
                      "title": "entry点赞",
                      "method": "POST",
                      "path": "component/entry/:entry_id/like",
                      "type": 2,
                      "children": []
                    },
                    {
                      "key": 404013,
                      "title": "entry点赞详情",
                      "method": "GET",
                      "path": "component/entry/:entry_id/like",
                      "type": 2,
                      "children": []
                    },
                    {
                      "key": 404014,
                      "title": "entry取消点赞",
                      "method": "DELETE",
                      "path": "component/entry/:entry_id/like",
                      "type": 2,
                      "children": []
                    }
                  ]
                },
                {
                  "key": "4fd17931-4228-4566-b0b8-ff7d8a9c860c",
                  "title": "统计",
                  "level": 4,
                  "type": 1,
                  "children": [
                    {
                      "key": 404016,
                      "title": "entry统计",
                      "method": "GET",
                      "path": "component/entry/statistic?entry_ids=xxxx&entry_ids=1ddd",
                      "type": 2,
                      "children": []
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "key": "af153a7b-6159-4a5c-9494-f010af7b6456",
          "title": "结构",
          "level": 2,
          "type": 1,
          "children": [
            {
              "key": 404561,
              "title": "发送kafka的消息体--无路径",
              "method": "POST",
              "path": "/api/kafka/message",
              "type": 2,
              "children": []
            }
          ]
        }
      ]
    },
    {
      "key": "fd802313-35f5-4e7c-bc9f-ab77d0bac988",
      "title": "飞书云文档",
      "level": 1,
      "type": 1,
      "children": [
        {
          "key": 404032,
          "title": "获取云文档的阅读jsticket",
          "method": "GET",
          "path": "component/lark/jsticket",
          "type": 2,
          "children": []
        }
      ]
    }
  ]
  


 const createNestProjectApiMap = (data: Array<any>) => {
    if (data.every((item) => Number.isInteger(item.key)))
      return data.map((item) => item.key);
    return data.map((item) => {
      return {
        title: item.title,
        children: item.children.map((self: any) => {
          if (!Number.isInteger(self.key))
            return {
              title: self.title,
              children: createNestProjectApiMap(self.children),
            };
          return self.key;
        }),
      };
    });
  };

  const decoratedNest3json = createNestProjectApiMap(nest3json)

const getProjectApiTypeDirectory = (
    parent: string,
    data: Array<any>,
  ): string[] => {
    debugger
    if (!data || data.every((item) => Number.isInteger(item))) return [];
    if (parent) {
      return data
        .filter((item) => !Number.isInteger(item))
        .map(
          (item) =>
            `${parent}/${item.title}/${getProjectApiTypeDirectory(`${parent}/${item.title}`, item.children)}`,
        );
    }
    return data
      .filter((item) => !Number.isInteger(item))
      .map((item) =>
        !`${getProjectApiTypeDirectory(item.title, item.children)}`
          ? item.title
          : `${getProjectApiTypeDirectory(item.title, item.children)}`,
      );
  };
getProjectApiTypeDirectory('',decoratedNest3json)