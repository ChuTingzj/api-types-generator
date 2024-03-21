export interface Response {
    auto: boolean;
    code: number;
    data: Datum[];
    err: string;
    message: string;
    status: number;
    traceId: string;
    [property: string]: any;
  }
  
  export interface Datum {
    children: Child[];
    key: string;
    level: number;
    title: string;
    type: number;
    [property: string]: any;
  }
  
  export interface Child {
    children: any[];
    key: number;
    method: string;
    path: string;
    title: string;
    type: number;
    [property: string]: any;
  }