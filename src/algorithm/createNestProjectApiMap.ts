export const apiTitleKeyMap:Record<string,string> = {}

export const createNestProjectApiMap = (data: Array<any>) => {
    if (data.every(item => Number.isInteger(item.key))) return data.map(item => (Reflect.set(apiTitleKeyMap,String(item.key),item.title),item.key))
    return data.map(item => {
      return {
        title: item.title,
        key: item.key,
        children: item.children.map((self: any) => {
          if (!Number.isInteger(self.key)) return { title: self.title, key: self.key, children: createNestProjectApiMap(self.children) }
          Reflect.set(apiTitleKeyMap,String(self.key),self.title)
          return self.key
        })
      }
    })
  }