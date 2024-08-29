import { newFetchRequest } from "./fetchRequest";

const myFetch = newFetchRequest({
    baseUrl: 'http://localhost:3000',
    timeout: 3000,
    loginUrl: '/login',
    refreshTokenUrl: {
        fetchConfig: {
            url: '/refreshlogin',
            method: 'POST',
            data: {
                dd: '55'
            }
        },
        setToken: (_: unknown) => '111'
    },
    getToken: () => 'ttt',
    handleMessage: {
        error: (msg) => console.log(msg)
    }
})
const { mainFetch } = myFetch

mainFetch({
    url: '/',
    method: 'GET',
}).then(
    res => {
        console.log(res);

    }
).catch(e => {
    console.log(e, '///');
})

mainFetch({
    url: '/test',
    method: 'POST',
}).then(
    res => {
        console.log(res);
    }
).catch(e => {
    console.log(e, 'test');
})