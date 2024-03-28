export function flatten(arr: Array<any>): Array<any> {
    return arr.reduce((acc, cur) => {
      if (Array.isArray(cur)) {
        return acc.concat(flatten(cur));
      }
      return acc.concat(cur);
    }, []);
  }