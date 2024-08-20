import endpoint from "./endpoint";
import axios, { AxiosRequestConfig } from "axios";
import prisma from "./prisma";

export default {
    request: async (params: IRequestParams) => {
        try {
            let headers: any = {
                'Api-Request': 'True',
                'Content-Type': 'application/json',
            };

            const url = (params.endpoint ?? endpoint.api) + params.path;

            let config: AxiosRequestConfig<any> = {
                method: params.method,
                url: url,
                headers: headers,
            };

            if (params.method != 'GET' && params.data) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded'

                const body = new FormData();

                Object.keys(params.data).forEach(key => {
                    if (params.data[key]) {
                        body.append(key, params.data[key]);
                    }
                });

                config.data = body;

            }

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

            const response = await axios(config);

            if(process.env.API_LOG == 'true') {
                await prisma.apiRequestLog.create({
                    data: {
                        method: params.method,
                        url,
                        headers,
                        body: params.data ?? {},
                        response: response.data,
                        status: response.status
                    }
                });
            }

            if(response.data.code == 4 && response.data.returnData == "NeedAuthentication") {
                return Promise.reject(403);
            }
                
            return response.data;
        } catch (error) {
            return Promise.reject(error);
        }
    }
}

interface IRequestParams {
    endpoint?: string;
    path: string;
    method: 'POST' | 'GET' | 'DELETE';
    headers?: any;
    token?: string;
    data?: any;
}