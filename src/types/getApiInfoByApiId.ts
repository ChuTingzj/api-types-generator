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
    add_time: number;
    basepath: string;
    categoryId: string;
    categoryTitle: string;
    className: string;
    desc: string;
    id: number;
    isAutoParse: number;
    isSensitive: boolean;
    iterationVersion: string;
    markdown: string;
    method: string;
    modifyUserName: string;
    path: string;
    planIds: string;
    planNames: string;
    projectId: number;
    req_body_form: any[];
    req_body_is_json_schema: boolean;
    req_body_other: string;
    req_body_type: string;
    req_headers: any[];
    req_params: any[];
    req_query: any[];
    res_body: string;
    res_body_is_json_schema: boolean;
    res_body_type: string;
    status: string;
    targetSource: string;
    title: string;
    uid: number;
    up_time: number;
    username: string;
    userName: string;
    [property: string]: any;
}