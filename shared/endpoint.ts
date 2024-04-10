let api = "";

export default {
    get api() {
        return api;
    },
    set api(value: string) {
        api = value;
    },
    format(link: string) {
        if(link && link.includes('http')) return link;
        return api + link;
    }
}