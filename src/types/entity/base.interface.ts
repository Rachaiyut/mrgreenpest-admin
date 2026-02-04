export interface IBase {
    id: string,
    created_at?: string,
    updated_at?: string,
}

export interface IBaseQuery {
    search?: string,
    page?: number,
    limit?: number,
    sort_by?: string,
    sort_order?: string,
    status?: string,
    [key: string]: any,
}

export interface IMeta {
    total: number,
    page: number,
    limit: number,
    pages: number,
}

export interface IBaseResponse<T> {
    status: string,
    success: boolean,
    data: T,
}

export interface IBaseResponseArray<T> {
    status: string,
    success: boolean,
    data: T[],
    meta?: IMeta,
}

