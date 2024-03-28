export const flattenStruct = (arr: Array<any>): any => {
    return arr.map((item) => {
      if (typeof item === "object" && Reflect.has(item, "children")) {
        return [
          {
            title: item.title,
            key: item.key,
            children: item.children.filter((i: any) =>
              Number.isInteger(i),
            ),
          },
        ].concat(flattenStruct(item.children));
      }
    });
  };