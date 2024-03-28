export const LeafNodeMap: Record<string, { title: string, children: Array<number> }> = {}

export const getProjectApiTypeDirectory = (parent: string, data: Array<any>): string[] => {
    if (!data || data.every(item => Number.isInteger(item))) return []
    if (parent) {
      return data
        .filter((item) => !Number.isInteger(item))
        .map(
          (item) => {
            if (item.children.some((i: any) => Number.isInteger(i))) {
              Reflect.set(LeafNodeMap, item.key, { title: `${parent}/${item.title}`, children: [] })
            }
            return `${parent}/${item.title}/,${getProjectApiTypeDirectory(`${parent}/${item.title}`, item.children)}`
          }
        );
    }
    return data.filter(item => !Number.isInteger(item)).map(item => {
      if (item.children.some((i: any) => Number.isInteger(i))) {
        Reflect.set(LeafNodeMap, item.key, { title: item.title, children: [] })
      }
      return !`${getProjectApiTypeDirectory(item.title, item.children)}` ? item.title : `${getProjectApiTypeDirectory(item.title, item.children)}`
    })
  }