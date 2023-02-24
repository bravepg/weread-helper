import { message } from "antd";
import type { AxiosInstance } from "axios";
import axios from "axios";

export default class WereadService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://i.weread.qq.com",
      withCredentials: true,
    });
  }

  // 更新用户 cookie
  async refreshCookie() {
    await axios({
      url: "https://weread.qq.com",
      method: "HEAD",
    });
  }

  // 获取用户信息
  async getUserInfo(vidUrl: string) {
    const result = await this.axiosInstance.get(vidUrl);
    return result.data;
  }

  // 获取全部书籍
  async getBooks(isRetry?: boolean) {
    let books = [];
    try {
      const result = await this.axiosInstance.get("/user/notebooks");
      books = result.data?.books || [];
    } catch (e) {
      if (e.response?.status !== 401) {
        return;
      }

      if (isRetry) {
        chrome.storage.local.set({
          wereadUserInfo: {},
        });
        message.error("用户信息失效，请前往登录微信读书");
        location.href = "index.html";
      } else {
        await this.refreshCookie();
      }
    }

    return books;
  }

  async getBooksWithRetry() {
    let books = await this.getBooks();
    // 如果 books 不存在，可能是用户信息过期了
    // 需要重新获取一次
    if (!books.length) {
      books = await this.getBooks(true);
    }
    return books;
  }

  // 根据 ID 获取书籍信息
  async getBookDetail(bookId: string) {
    const result = await this.axiosInstance.get(`/book/info?bookId=${bookId}`);
    return result.data;
  }

  // 获取书籍目录
  async getNotebookChapters(bookId: string) {
    const result = await this.axiosInstance.get(
      `/book/chapterInfos?bookIds=${bookId}&synckeys=0`
    );
    return result.data;
  }

  // 获取划线
  async getNotebookHighlights(bookId: string) {
    const result = await this.axiosInstance.get(
      `/book/bookmarklist?bookId=${bookId}`
    );
    return result.data;
  }

  // 获取笔记
  async getNotebookReviews(bookId: string) {
    const result = await this.axiosInstance.get(
      `/review/list?bookId=${bookId}&listType=11&mine=1&synckey=0`
    );
    return result.data;
  }
}
