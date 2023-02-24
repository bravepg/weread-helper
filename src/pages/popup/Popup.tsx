import React, { useEffect, useState } from "react";
import {
  Avatar,
  ConfigProvider,
  Button,
  Input,
  Popover,
  Progress,
  Select,
  Spin,
  message,
} from "antd";
import find from "lodash.find";
import {
  QuestionCircleFilled,
  UserOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import Notebooks from "@src/models/notebooks";
import WereadService from "@services/weread";
import YuqueService from "@services/yuque";
import { parseMetadata } from "@src/utils/parseResponse";
import { YuqueDocument, YuqueRepository } from "@src/types/yuque";

import "@pages/popup/Popup.css";

type YuqueInfo = {
  token?: string;
  repository?: YuqueRepository;
  catalog?: YuqueDocument;
};

const wereadService = new WereadService();
const notebooks = new Notebooks(wereadService);
const yuqueService = new YuqueService();

const Popup = () => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [percent, setPercent] = useState(0);
  const [wereadUserInfo, setWereadUserInfo] = useState({
    userVid: 0,
    name: "",
    avatar: "",
  });
  const [yuqueInfo, setYuqueInfo] = useState<YuqueInfo>();
  const [catalogs, setCatalogs] = useState<YuqueDocument[]>([]);
  const [repositories, setRepositories] = useState<YuqueRepository[]>([]);

  const getLocalStorage = () => {
    chrome.storage.local.get(
      ["wereadUserInfo", "yuqueInfo"],
      async (localStorage) => {
        console.log("localStorage", localStorage);
        setWereadUserInfo(localStorage.wereadUserInfo);
        setYuqueInfo(localStorage.yuqueInfo);
        setUpYuqueBasic(localStorage.yuqueInfo);
      }
    );
  };

  const setUpYuqueBasic = async (yuqueInfo: YuqueInfo) => {
    try {
      const { token, repository, catalog } = yuqueInfo || {};
      if (!token) {
        return;
      }

      yuqueService.setAxiosInstance(token);
      const repositories = await yuqueService.getRepositories();
      setRepositories(repositories);

      if (repository) {
        yuqueService.setNamespace(repository.namespace);
        const catalogs = await yuqueService.getCatalogs();
        setCatalogs(catalogs);
      }

      if (catalog) {
        yuqueService.setCatalog(catalog.uuid);
      }
    } catch (e) {
      console.log("setUpYuqueBasic error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveYuqueToken = async () => {
    try {
      yuqueService.setAxiosInstance(yuqueInfo.token);
      const userInfo = await yuqueService.getUserInfo();
      if (userInfo?.login) {
        const newYuqueInfo = {
          token: yuqueInfo.token,
        };
        chrome.storage.local.set({ yuqueInfo: newYuqueInfo });
        // 修改 token 需要重新设置
        setUpYuqueBasic(newYuqueInfo);
        setYuqueInfo(newYuqueInfo);
        setEditing(false);
      }
    } catch (e) {
      if (e.response.status === 401) {
        message.error("校验失败，请确认 token 是否有效");
      }
    }
  };

  const handleChangeYuqueRepository = async (namespace: string) => {
    const repository = find(repositories, { namespace });

    if (repository) {
      const changedYuqueInfo = {
        ...yuqueInfo,
        repository,
        catalog: undefined,
      };
      setYuqueInfo(changedYuqueInfo);
      chrome.storage.local.set({
        yuqueInfo: changedYuqueInfo,
      });

      yuqueService.setNamespace(namespace);
      const catalogs = await yuqueService.getCatalogs();
      setCatalogs(catalogs);
    }
  };

  const handleChangeCatalog = (uuid: string) => {
    const catalog = find(catalogs, { uuid });

    if (catalog) {
      const changedYuqueInfo = {
        ...yuqueInfo,
        catalog,
      };
      setYuqueInfo(changedYuqueInfo);
      chrome.storage.local.set({
        yuqueInfo: changedYuqueInfo,
      });

      yuqueService.setCatalog(uuid);
    }
  };

  const handleSyncNotebooksToYuque = async () => {
    try {
      setSyncing(true);
      const books = await wereadService.getBooksWithRetry();
      const metaDataArr = books.map((noteBook) => parseMetadata(noteBook));
      // 获取上一次同步的数据信息
      const { readDataArrCache = [] } = await chrome.storage.local.get([
        "readDataArrCache",
      ]);
      const filterMetaDataArr = metaDataArr.filter(
        (item) =>
          !find(readDataArrCache, {
            bookId: item.bookId,
            lastReadTime: item.lastReadTime,
          })
      );

      const booksWithMetaData = await Promise.all(
        filterMetaDataArr.map((meta) => notebooks.convertToNotebook(meta))
      );
      console.log("booksWithMetaData", booksWithMetaData);
      const iframe = document.getElementById("sandbox") as HTMLIFrameElement;
      iframe.contentWindow.postMessage(booksWithMetaData, "*");

      // 将本次获取的书籍信息做个缓存
      await chrome.storage.local.set({
        readDataArrCache: metaDataArr.map((item) => ({
          bookId: item.bookId,
          lastReadTime: item.lastReadTime,
        })),
      });
    } catch (e) {
      setSyncing(false);
      console.log("getNotebookserror", e);
    }
  };

  useEffect(() => {
    getLocalStorage();

    window.addEventListener("message", async (event) => {
      try {
        const notebooksWithMarkdown = event.data;
        let index = 0;
        for (const notebookWithMarkdown of notebooksWithMarkdown) {
          await yuqueService.generateDocument(notebookWithMarkdown);
          index = index + 1;
          const number = index / (notebooksWithMarkdown?.length ?? 1);
          const percent = parseInt(String(number * 100));
          setPercent(Number(percent));
        }
        if (notebooksWithMarkdown.length) {
          message.success(
            `更新完毕，本次更新 ${notebooksWithMarkdown.length} 本书`
          );
        } else {
          message.success("本次没有需要更新的书籍");
        }
      } catch (e) {
        console.log("generateDocument", e);
      } finally {
        setSyncing(false);
        setPercent(0);
      }
    });
  }, []);

  return (
    <ConfigProvider componentSize="small">
      <div className="popupContainer">
        {loading ? (
          <Spin className="popupLoading" />
        ) : (
          <>
            <div className="popupHeader">
              <Avatar
                className="wereadAvatar"
                src={wereadUserInfo?.avatar}
                icon={<UserOutlined />}
              />
              <div>
                <a
                  href={
                    wereadUserInfo?.userVid
                      ? "https://weread.qq.com/web/shelf"
                      : "https://weread.qq.com"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <ThunderboltFilled className="wereadLogo" />
                  {wereadUserInfo?.userVid ? "我的书架" : "前往登录微信读书"}
                </a>
              </div>
            </div>
            <div className="popupDescription">设置语雀信息</div>
            <div className="tokenContainer">
              <div className="popupLabel">
                token {}
                <Popover
                  content={
                    <a
                      href="https://www.yuque.com/u102810/vpgl60/yxu70cfc1rtgzxt5?singleDoc"
                      target="_blank"
                      rel="noreferrer"
                    >
                      点击查看如何设置
                    </a>
                  }
                >
                  <QuestionCircleFilled />
                </Popover>
              </div>
              <Input
                value={yuqueInfo?.token}
                disabled={!editing}
                style={{ flex: 1, width: 120, margin: "0 8px" }}
                onChange={(e) =>
                  setYuqueInfo({ ...yuqueInfo, token: e.target.value })
                }
              />
              {editing && (
                <Button
                  style={{ marginRight: 8 }}
                  onClick={() => {
                    chrome.storage.local.get(["yuqueInfo"], (localStorage) => {
                      setEditing(false);
                      setYuqueInfo(localStorage.yuqueInfo);
                    });
                  }}
                >
                  取消
                </Button>
              )}

              <Button
                type={editing ? "primary" : "default"}
                onClick={
                  editing
                    ? handleSaveYuqueToken
                    : () => {
                        setEditing(true);
                      }
                }
              >
                {editing ? "校验" : "编辑"}
              </Button>
            </div>

            <div className="noteContainer">
              <div className="popupLabel">知识库</div>
              <Select
                value={yuqueInfo?.repository?.namespace}
                disabled={!yuqueInfo?.token}
                placeholder={
                  yuqueInfo?.token ? "请选择知识库" : "设置 token 后选择"
                }
                style={{ flex: 1, width: 120, margin: "0 8px" }}
                getPopupContainer={(e) => e}
                onChange={(e) => {
                  handleChangeYuqueRepository(e);
                }}
              >
                {repositories.map((item) => (
                  <Select.Option key={item.namespace} value={item.namespace}>
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
              <Button style={{ visibility: "hidden" }}>同步</Button>
            </div>
            <div className="noteContainer">
              <div className="popupLabel">
                目录
                <Popover
                  content={
                    <a
                      href="https://www.yuque.com/u102810/vpgl60/yxu70cfc1rtgzxt5?singleDoc#jmzzf"
                      target="_blank"
                      rel="noreferrer"
                    >
                      了解目录
                    </a>
                  }
                >
                  <QuestionCircleFilled />
                </Popover>
              </div>
              <Select
                value={yuqueInfo?.catalog?.uuid}
                disabled={!yuqueInfo?.repository}
                placeholder={
                  yuqueInfo?.repository
                    ? "请选择目录"
                    : "可选，设置知识库后选择"
                }
                style={{ flex: 1, width: 120, margin: "0 8px" }}
                getPopupContainer={(e) => e}
                onChange={(e) => {
                  handleChangeCatalog(e);
                }}
              >
                {catalogs.map((item) => (
                  <Select.Option key={item.uuid} value={item.uuid}>
                    {item.title}
                  </Select.Option>
                ))}
              </Select>
              <Button
                type="primary"
                loading={syncing}
                disabled={!wereadUserInfo?.userVid || !yuqueInfo?.repository}
                onClick={handleSyncNotebooksToYuque}
              >
                同步
              </Button>
            </div>
            {syncing && (
              <Progress
                percent={percent}
                style={{ marginBottom: 0, paddingLeft: 12 }}
              />
            )}
            {(wereadUserInfo?.userVid || yuqueInfo?.token) && (
              <Button
                className="settingButton"
                danger
                type="link"
                disabled={syncing}
                onClick={() => {
                  chrome.storage.local.clear();
                  location.href = "index.html";
                }}
              >
                清除设置
              </Button>
            )}
          </>
        )}
      </div>
    </ConfigProvider>
  );
};

export default Popup;
