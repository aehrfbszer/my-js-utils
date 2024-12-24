import { newFetchRequest } from "./fetchRequest";

const myFetch = newFetchRequest({
  baseUrl: "http://localhost:3000",
  timeout: 3000,
  loginUrl: "/login",
  refreshTokenUrl: {
    fetchConfig: {
      url: "/refreshlogin",
      method: "POST",
      data: {
        dd: "55",
      },
    },
    setToken: (_: unknown) => "111",
  },
  getToken: () => "ttt",
  handleMessage: {
    error: (msg) => console.warn(msg),
  },
});
const { mainFetch, resetLoadingTool } = myFetch;

resetLoadingTool({
  start: () => {
    console.log("start-----------------------");
  },
  finish: () => {
    console.log("finish-----------------------");
  },
  error: () => {
    console.log("error-----------------------");
  },
});

const uuu = () => {
  mainFetch(
    {
      url: "/x-www-form-urlencoded",
      method: "post",
      data: new URLSearchParams({
        dsa: "greg",
        gf: "🌙",
      }),
    },
  ).then(
    (res) => {
      console.log(res, "FF");
    },
  );
};

uuu();

const query = () =>
  mainFetch(
    {
      url: "/",
      method: "GET",
    },
    {
      responseIsJson: false,
      repeat_request_cancel: true,
    },
  )
    .then((res) => {
      console.log(res);
    })
    .catch((e) => {
      console.log(e, "///");
    });
query();
query();
query();
query();
query();
query();
query();
query();

mainFetch({
  url: "/test",
  method: "POST",
})
  .then((res) => {
    console.log(res);
  })
  .catch((e) => {
    console.log(e, "test");
  });

mainFetch(
  {
    url: "/fail",
    method: "get",
  },
  {
    responseIsJson: false,
  },
)
  .then((r) => {
    console.log(r);
  })
  .catch((e) => {
    console.log(e, "fff");
  });
