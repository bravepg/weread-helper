import { useEffect } from "react";
import Renderer from "./render";

const renderer = new Renderer();

const Sandbox = () => {
  useEffect(() => {
    window.addEventListener("message", async function (event) {
      const notebookWithMarkdownList = [];
      for (const notebook of event.data) {
        const mdContent = renderer.render(notebook);
        notebookWithMarkdownList.push({
          notebook,
          mdContent,
        });
      }

      // eslint-disable-next-line
      // @ts-ignore
      event.source.window.postMessage(notebookWithMarkdownList, event.origin);
    });
  }, []);

  return null;
};

export default Sandbox;
