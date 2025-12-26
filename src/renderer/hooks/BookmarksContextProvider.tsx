/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { TS } from '-/tagspaces.namespace';

type BookmarksContextData = TS.BookmarksContextData;

export const bookmarksHistoryKey = 'tsBookmarks';

export const BookmarksContext = createContext<BookmarksContextData>({
  bookmarks: [],
  setBookmark: undefined,
  haveBookmark: undefined,
  delAllBookmarks: undefined,
  delBookmark: undefined,
});

export type BookmarksContextProviderProps = {
  children: React.ReactNode;
};

const storageKey = 'TS_BOOKMARKS_V1';

function loadBookmarks(): TS.BookmarkItem[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: TS.BookmarkItem[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}

export const BookmarksContextProvider = ({
  children,
}: BookmarksContextProviderProps) => {
  const bookmarks = useRef<TS.BookmarkItem[]>(loadBookmarks());
  const [ignored, forceUpdate] = useReducer((x) => x + 1, 0, undefined);

  useEffect(() => {
    saveBookmarks(bookmarks.current);
  }, [ignored]);

  const haveBookmark = useCallback((filePath: string) => {
    if (!filePath) return false;
    return bookmarks.current.some((b) => b.path === filePath);
  }, []);

  const setBookmark = useCallback((filePath: string, url: string) => {
    if (!filePath) return;
    const now = Date.now();
    const next = bookmarks.current.filter((b) => b.path !== filePath);
    next.unshift({ path: filePath, url, creationTimeStamp: now });
    bookmarks.current = next;
    forceUpdate();
  }, []);

  const delBookmark = useCallback((filePath: string) => {
    if (!filePath) return;
    bookmarks.current = bookmarks.current.filter((b) => b.path !== filePath);
    forceUpdate();
  }, []);

  const delAllBookmarks = useCallback(() => {
    bookmarks.current = [];
    forceUpdate();
  }, []);

  const context = useMemo(() => {
    return {
      bookmarks: bookmarks.current,
      setBookmark,
      haveBookmark,
      delAllBookmarks,
      delBookmark,
    };
  }, [ignored, setBookmark, haveBookmark, delAllBookmarks, delBookmark]);

  return (
    <BookmarksContext.Provider value={context}>
      {children}
    </BookmarksContext.Provider>
  );
};
