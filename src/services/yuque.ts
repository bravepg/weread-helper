import type { AxiosInstance } from "axios";
import axios from "axios";

import {
  YuqueDocument,
  YuqueUserInfo,
  YuqueRepository,
} from "@src/types/yuque";

export default class YuqueService {
  private axiosInstance: AxiosInstance;
  private userInfo: YuqueUserInfo;
  private namespace: string;
  private catalogId: string;

  constructor(token?: string) {
    this.setAxiosInstance(token);
  }

  setAxiosInstance(token?: string) {
    this.axiosInstance = axios.create({
      baseURL: "https://www.yuque.com/api/v2",
      headers: { "X-Auth-Token": token },
    });
  }

  setNamespace(namespace: string) {
    this.namespace = namespace;
  }

  setCatalog(catalogId: string) {
    this.catalogId = catalogId;
  }

  async getUserInfo(): Promise<YuqueUserInfo> {
    const result = await this.axiosInstance.get("/user");
    return result.data?.data ?? {};
  }

  async getRepositories(): Promise<YuqueRepository[]> {
    if (!this.userInfo) {
      this.userInfo = await this.getUserInfo();
    }

    const result = await this.axiosInstance.get(
      `/users/${this.userInfo.login}/repos`
    );

    return result.data?.data ?? [];
  }

  async getCatalogs(): Promise<YuqueDocument[]> {
    const result = await this.axiosInstance.get(`/repos/${this.namespace}/toc`);
    return (result.data?.data ?? []).filter((item) => item.type === "TITLE");
  }

  async getDocument(slug: string): Promise<YuqueDocument> {
    let doument: YuqueDocument = {
      id: "",
      title: "",
      type: "TITLE",
    };
    try {
      const result = await this.axiosInstance.get(
        `/repos/${this.namespace}/docs/${slug}`
      );
      doument = result.data?.data;
    } catch (e) {
      console.log("e", e);
    }

    return doument;
  }

  async deleteDocument(id: string): Promise<YuqueDocument> {
    const result = await this.axiosInstance.delete(
      `/repos/${this.namespace}/docs/${id}`
    );
    return result.data?.data;
  }

  async updateDocument({
    id,
    bookId,
    title,
    mdContent,
  }: {
    id: string;
    bookId: string;
    title: string;
    mdContent: string;
  }): Promise<YuqueDocument> {
    const result = await this.axiosInstance.put(
      `/repos/${this.namespace}/docs/${id}`,
      {
        slug: bookId,
        title,
        body: mdContent,
      }
    );
    return result.data?.data;
  }

  async createDocument({
    bookId,
    title,
    mdContent,
  }: {
    bookId: string;
    title: string;
    mdContent: string;
  }) {
    const createResult = await this.axiosInstance.post(
      `repos/${this.namespace}/docs`,
      {
        slug: bookId,
        title,
        body: mdContent,
      }
    );

    const docId = createResult.data?.data?.id;
    if (!docId) {
      return;
    }

    await this.axiosInstance.put(`/repos/${this.namespace}/toc`, {
      action: "appendByDocs",
      doc_ids: [docId],
      target_uuid: this.catalogId || null,
    });
  }

  async generateDocument(notebookWithMarkdown) {
    if (!this.userInfo) {
      this.userInfo = await this.getUserInfo();
    }

    const { notebook, mdContent } = notebookWithMarkdown || {};
    if (!notebook || !mdContent) {
      return;
    }

    const { title, bookId } = notebook.metaData || {};

    const document = await this.getDocument(bookId);
    // 更新文档
    if (document?.id) {
      try {
        await this.updateDocument({
          id: document.id,
          bookId,
          title,
          mdContent,
        });
      } catch (e) {
        if (e.response?.status === 400) {
          const deleteResult = await this.deleteDocument(document.id);
          if (deleteResult?.id) {
            await this.createDocument({
              bookId,
              title,
              mdContent,
            });
          }
        }
      }
    } else {
      await this.createDocument({
        bookId,
        title,
        mdContent,
      });
    }
  }
}
