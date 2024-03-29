import endpoint from "./endpoint";
import axios, { AxiosRequestConfig } from "axios";

export default {
    request: async (params: IRequestParams) => {
        try {
            let headers: any = {
                'Api-Request': 'True',
                'Content-Type': 'application/json',
            };

            // bearer token if exists 
            if (params.token) {
                headers['Bearer'] = params.token;
            }

            if (params.headers) {
                headers = {
                    ...headers,
                    ...params.headers
                };
            }

            let config: AxiosRequestConfig<any> = {
                method: params.method,
                url: endpoint.api + params.path,
                headers: headers,
            };

            if (params.data) {
                config.data = params.data;
            }

            const response = await axios(config);

            return response.data;
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

interface IRequestParams {
    path: string;
    method: 'POST' | 'GET';
    headers?: any;
    token?: string;
    data?: any;
}