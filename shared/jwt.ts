import jsonwebtoken from 'jsonwebtoken';

export default {
    extract(token: string): any {
        return jsonwebtoken.decode(token);
    }
}