import dayjs from "dayjs";
import find from "lodash.find";
import { NodeHtmlMarkdown } from "node-html-markdown";
import {
  BookReview,
  Chapter,
  ChapterHighlight,
  Highlight,
  Metadata,
  Review,
} from "@src/types/weread";

export const parseMetadata = (noteBook): Metadata => {
  const { book, noteCount, reviewCount, sort } = noteBook;
  const { bookId, type: bookType, author, title, cover, publishTime } = book;
  const metaData = {
    bookId,
    bookType,
    author,
    title,
    cover: cover.replace("/s_", "/t7_"),
    noteCount, // 划线数量
    reviewCount, // 笔记数量
    publishTime: dayjs(publishTime).format("YYYY-MM-DD"), // 出版时间
    lastReadTime: dayjs(sort * 1000).format("YYYY-MM-DD HH:mm:ss"), // 上次阅读时间
  };
  return metaData;
};

// level 的取值 1、2、3
export const parseChapters = (chapters = []): Chapter[] => {
  let ancestor = null;
  let parent = null;
  const structuredChapters = [];

  for (const chapter of chapters) {
    const { chapterUid } = chapter;
    if (chapter.level === 1) {
      ancestor = chapterUid;
    }
    if (chapter.level === 2) {
      chapter.parent = ancestor;
      parent = chapterUid;
    }
    if (chapter.level === 3) {
      chapter.parent = parent;
    }

    structuredChapters.push(chapter);

    // 特殊数据处理
    if (chapter.anchors) {
      const sortedAnchors = chapter.anchors.sort((a, b) => a.level - b.level);
      for (const anchor of sortedAnchors) {
        if (anchor.level === 2) {
          anchor.parent = ancestor;
          parent = anchor.anchor;
        }
        if (anchor.level === 3) {
          anchor.parent = parent;
        }
        structuredChapters.push({
          chapterUid: anchor.anchor,
          title: anchor.title,
          level: anchor.level,
          parent: anchor.parent,
        });
      }
    }
  }

  return structuredChapters.map((item) => ({
    chapterUid: item.chapterUid,
    chapterTitle: item.title,
    level: item.level,
    parent: item.parent,
  }));
};

const addLevelAndParent = <T extends { chapterUid?: number }>(
  items: T[],
  bookChapters: Chapter[]
): T[] => {
  const formatItems: T[] = [];

  for (const item of items) {
    const chapter = find(bookChapters, { chapterUid: item.chapterUid });
    if (chapter.level === 2) {
      const hasAncestor = find(formatItems, { chapterUid: chapter.parent });
      if (!hasAncestor) {
        const ancestor = find(bookChapters, { chapterUid: chapter.parent });
        formatItems.push({
          ...ancestor,
          reviews: [],
          chapterReviews: [],
        });
      }
    }
    if (chapter.level === 3) {
      const parent = find(bookChapters, { chapterUid: chapter.parent });
      const ancestor = find(bookChapters, { chapterUid: parent.parent });

      const hasParent = find(formatItems, { chapterUid: chapter.parent });
      const hasAncestor = find(formatItems, { chapterUid: parent.parent });

      if (!hasAncestor) {
        formatItems.push({
          ...ancestor,
          reviews: [],
          chapterReviews: [],
        });
      }
      if (!hasParent) {
        formatItems.push({
          ...parent,
          reviews: [],
          chapterReviews: [],
        });
      }
    }
    formatItems.push({
      ...item,
      ...chapter,
    });
  }

  return formatItems;
};

export const parseHighlights = (highlightData, reviewData): Highlight[] => {
  const { chapters = [], refMpInfos = [], updated: highlights } = highlightData;
  const chapterMap = new Map(
    (chapters.length ? chapters : refMpInfos).map((chapter) => [
      chapter.chapterUid || chapter.reviewId,
      chapter.title,
    ])
  );
  return highlights.map((highlight) => {
    const { createTime, markText, range } = highlight;
    const { reviews } = reviewData;
    const chapterUid = highlight.chapterUid || highlight.refMpReviewId;
    let reviewContent;
    if (reviews.length) {
      const review = reviews
        .map((reviewRaw) => reviewRaw.review)
        .filter((reviewRaw) => reviewRaw.range === range)
        .shift();
      if (review) {
        reviewContent = review.content;
      }
    }

    let bookmarkId = highlight.bookmarkId;
    if (bookmarkId.startsWith("MP_WXS")) {
      bookmarkId = range;
    }

    return {
      bookmarkId: bookmarkId.replace(/_/gi, "-"),
      chapterUid,
      chapterTitle: chapterMap.get(chapterUid),
      created: createTime,
      createdTime: dayjs(createTime * 1000).format("YYYY-MM-DD HH:mm:ss"),
      markText: markText.replace(/\n/gi, ""),
      range,
      reviewContent,
    };
  });
};

export const parseReviews = (reviewData): Review[] => {
  const { reviews } = reviewData;
  return reviews.map((reviewRaw) => {
    const { review } = reviewRaw;
    const {
      abstract,
      bookId,
      chapterUid,
      chapterTitle,
      createTime,
      content,
      htmlContent,
      range,
      refMpInfo,
      reviewId,
      type,
    } = review;
    const mdContent = htmlContent
      ? NodeHtmlMarkdown.translate(htmlContent)
      : null;

    return {
      reviewId: reviewId.replace(/_/gi, "-"),
      bookId,
      chapterUid: chapterUid ?? refMpInfo?.reviewId,
      chapterTitle: chapterTitle ?? refMpInfo?.title,
      created: createTime,
      createdTime: dayjs(createTime * 1000).format("YYYY-MM-DD HH:mm:ss"),
      content,
      mdContent: mdContent ? mdContent : content,
      abstract,
      range,
      type,
    };
  });
};

export const parseChapterReviews = (reviewData, bookChapters): BookReview => {
  const reviews = parseReviews(reviewData);
  const chapterReviews = reviews
    .filter((review) => review.type === 1)
    .sort((o1, o2) => o2.created - o1.created);

  const entireReviews = reviews.filter((review) => review.type == 4);
  const chapterResult = new Map();
  for (const review of chapterReviews) {
    const { chapterUid, chapterTitle } = review;
    const existChapter = chapterResult.get(chapterUid);
    if (!existChapter) {
      const chapter = {
        chapterUid,
        chapterTitle,
        reviews: [],
        chapterReviews: [],
      };
      if (review.range) {
        chapter.reviews.push(review);
      } else {
        chapter.chapterReviews.push(review);
      }
      chapterResult.set(chapterUid, chapter);
    } else {
      const chapterRview = chapterResult.get(chapterUid);
      if (review.range) {
        chapterRview.reviews.push(review);
      } else {
        chapterRview.chapterReviews.push(review);
      }
    }
  }
  Array.from(chapterResult.values()).forEach((chapter) =>
    chapter.reviews.sort((o1, o2) => {
      const o1Start = parseInt(o1.range.split("-")[0]);
      const o2Start = parseInt(o2.range.split("-")[0]);
      return o1Start - o2Start;
    })
  );
  const chapterReviewResult = Array.from(chapterResult.values()).sort(
    (o1, o2) => o1.chapterUid - o2.chapterUid
  );

  return {
    bookReviews: entireReviews,
    // 追加 level 和 parent 的信息
    chapterReviews: addLevelAndParent(chapterReviewResult, bookChapters),
  };
};

export const parseChapterHighlights = (
  highlights,
  bookChapters
): ChapterHighlight[] => {
  const chapterResult = [];
  for (const highlight of highlights) {
    const { chapterUid, chapterTitle } = highlight;
    const existChapter = chapterResult.find(
      (chapter) => chapter.chapterUid === highlight.chapterUid
    );
    const reviewCount = highlight.reviewContent ? 1 : 0;
    if (!existChapter) {
      const currentHighlight = [highlight];
      const chapter = {
        chapterUid,
        chapterTitle,
        chapterReviewCount: reviewCount,
        highlights: currentHighlight,
      };
      chapterResult.push(chapter);
    } else {
      existChapter.chapterReviewCount += reviewCount;
      existChapter.highlights.push(highlight);
    }
  }
  chapterResult.forEach((chapter) =>
    chapter.highlights.sort((o1, o2) => {
      const o1Start = parseInt(o1.range.split("-")[0]);
      const o2Start = parseInt(o2.range.split("-")[0]);
      return o1Start - o2Start;
    })
  );

  return addLevelAndParent(
    chapterResult.sort((o1, o2) => o1.chapterUid - o2.chapterUid),
    bookChapters
  );
};
