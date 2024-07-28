import jsonwebtoken from 'jsonwebtoken';

export default {
    extract(token: string): any {
        return jsonwebtoken.decode(token);
    },
    generate(payload: any, secret: string, expiresIn: string = '1h'): string {
        return jsonwebtoken.sign(payload, secret, {
            algorithm: 'HS256',
            expiresIn,
        })
    }
}