export type Metadata = {
  bookId: string;
  bookType: number;
  author: string;
  title: string;
  cover: string;
  publishTime: string;
  noteCount: number;
  reviewCount: number;
  lastReadTime: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  intro?: string;
  duplicate?: boolean;
};

export type Review = {
  reviewId: string;
  bookId?: string;
  chapterUid?: number;
  chapterTitle?: string;
  created: number;
  createTime: string;
  content: string;
  mdContent?: string;
  abstract?: string;
  range?: string;
  type: number;
};

export type Chapter = {
  chapterUid?: number;
  chapterTitle?: string;
  level?: number;
  parent?: string;
};

export type ChapterReview = {
  chapterUid: number;
  chapterTitle: string;
  chapterReviews?: Review[];
  reviews: Review[];
};

export type BookReview = {
  bookReviews: Review[];
  chapterReviews: ChapterReview[];
};

export type Highlight = {
  bookmarkId: string;
  chapterUid: number;
  chapterTitle: string;
  created: number;
  createTime: string;
  markText: string;
  reviewContent?: string;
  range: string;
};

export type ChapterHighlight = {
  chapterUid: number;
  chapterTitle: string;
  chapterReviewCount: number;
  highlights: Highlight[];
};

export type Notebook = {
  metaData: Metadata;
  bookReview: BookReview;
  chapterHighlights: ChapterHighlight[];
};
