export interface Response {
    auto: boolean;
    code: number;
    data: Data;
    err: string;
    message: string;
    status: number;
    traceId: string;
    [property: string]: any;
}

export interface Data {
    querySchema: any[];
    reqSchema: string[];
    resSchema: string[];
    [property: string]: any;
}
