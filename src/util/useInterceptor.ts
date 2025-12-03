"use client";

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { useRouter } from "next/navigation";

const apiInstance = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
});

apiInstance.interceptors.request.use(
  async (config) => {

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiInstance.interceptors.response.use(
  (response) => {
    const res = response.data;
    return res;
  },
  async function (err) {
    console.error("err", err);

    // 유효하지 않은 토큰
    if (err.response && err.response.status === 400) {
      // const router = useRouter();
      // router.push("/");
      return err.response.data;
    }

    // atk 만료 or인증실패
    if (err.response && err.response.status === 401) {
      // removeCookie("ticket-atk");
      // 토큰 재발급 요청, apiInstance가 아닌 axios로 요청하기

      return Promise.reject(err);
    }

    // atk가 undefined일때 500
    if (err.response && err.response.status === 500) {
      // removeCookie("ticket-atk");
    }
    if (err.response && err.response.status === 404) {
      // console.log("err", err.response.data.data);
      //  return Promise.reject(new Error("요청 데이터가 없습니다"));
      // return Promise.reject(err);
      return Promise.resolve();
      // return;
    }
  }
);

export default apiInstance;
