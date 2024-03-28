export const createNestProjectApiMap = (data: Array<any>) => {
    if (data.every(item => Number.isInteger(item.key))) return data.map(item => item.key)
    return data.map(item => {
      return {
        title: item.title,
        key: item.key,
        children: item.children.map((self: any) => {
          if (!Number.isInteger(self.key)) return { title: self.title, key: self.key, children: createNestProjectApiMap(self.children) }
          return self.key
        })
      }
    })
  }