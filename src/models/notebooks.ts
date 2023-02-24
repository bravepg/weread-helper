import WereadService from "@services/weread";
import {
  parseChapters,
  parseChapterReviews,
  parseHighlights,
  parseChapterHighlights,
} from "@src/utils/parseResponse";
import { Metadata, Notebook } from "@src/types/weread";

export default class Notebooks {
  private wereadService: WereadService;

  constructor(wereadService: WereadService) {
    this.wereadService = wereadService;
  }

  async convertToNotebook(metaData: Metadata): Promise<Notebook> {
    const chapters = (
      await this.wereadService.getNotebookChapters(metaData.bookId)
    )?.data?.[0]?.updated;
    const bookChapters = parseChapters(chapters);

    const bookDetail = await this.wereadService.getBookDetail(metaData.bookId);
    if (bookDetail) {
      const { category, publisher, intro, isbn } = bookDetail;
      metaData.category = category;
      metaData.publisher = publisher;
      metaData.intro = intro;
      metaData.isbn = isbn;
    }

    const highlightResult = await this.wereadService.getNotebookHighlights(
      metaData.bookId
    );
    const reviewResult = await this.wereadService.getNotebookReviews(
      metaData.bookId
    );
    const bookReview = parseChapterReviews(reviewResult, bookChapters);
    const highlights = parseHighlights(highlightResult, reviewResult);
    const chapterHighlights = parseChapterHighlights(highlights, bookChapters);

    return {
      metaData,
      bookReview,
      chapterHighlights,
    };
  }
}
