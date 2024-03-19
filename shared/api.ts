import endpoint from "./endpoint";
import axios from "axios";

export default {
    request: async (params: IRequestParams) => {
        try {
            let headers: any = {
                'Api-Request': 'True'
            };

            // bearer token if exists 
            if (params.token) {
                headers['Authorization'] = `Bearer ${params.token}`;
            }

            if(params.headers) {
                headers = {
                    ...headers,
                    ...params.headers
                };
            }

            const response = await axios({
                method: params.method,
                url: endpoint.api + params.path,
                headers: headers,
                data: params.data
            });

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