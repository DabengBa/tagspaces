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

import React, { createContext, useCallback, useMemo, useRef } from 'react';
import { TS } from '-/tagspaces.namespace';

type FileTemplatesContextData = TS.FileTemplatesContextData;

export const FileTemplatesContext = createContext<FileTemplatesContextData>({
  getTemplate: undefined,
  setTemplate: undefined,
  setTemplateActive: undefined,
  getTemplates: undefined,
  resetTemplates: undefined,
  delTemplate: undefined,
});

export type FileTemplatesContextProviderProps = {
  children: React.ReactNode;
};

const storageKey = 'TS_FILE_TEMPLATES_V1';
const activeKey = 'TS_FILE_TEMPLATES_ACTIVE_V1';

type TemplateStore = {
  templates: TS.FileTemplate[];
  activeId?: string;
};

function loadStore(): TemplateStore {
  try {
    const raw = localStorage.getItem(storageKey);
    const templates = raw ? JSON.parse(raw) : [];
    const activeId = localStorage.getItem(activeKey) || undefined;
    return {
      templates: Array.isArray(templates) ? templates : [],
      activeId,
    };
  } catch {
    return { templates: [], activeId: undefined };
  }
}

function saveStore(store: TemplateStore) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store.templates));
    if (store.activeId) localStorage.setItem(activeKey, store.activeId);
    else localStorage.removeItem(activeKey);
  } catch {
    // ignore
  }
}

export const FileTemplatesContextProvider = ({
  children,
}: FileTemplatesContextProviderProps) => {
  const storeRef = useRef<TemplateStore>(loadStore());

  const getTemplates = useCallback(() => {
    return storeRef.current.templates;
  }, []);

  const getTemplate = useCallback((type: string) => {
    if (!type) return undefined;
    const byId = storeRef.current.templates.find((t) => t.id === type);
    if (byId) return byId;
    return storeRef.current.templates.find((t) => t.type === type);
  }, []);

  const setTemplate = useCallback((id: string, value: TS.FileTemplate) => {
    if (!id || !value) return;
    const next = storeRef.current.templates.filter((t) => t.id !== id);
    next.unshift({ ...value, id });
    storeRef.current = { ...storeRef.current, templates: next };
    saveStore(storeRef.current);
  }, []);

  const delTemplate = useCallback((id: string) => {
    if (!id) return;
    const next = storeRef.current.templates.filter((t) => t.id !== id);
    const nextActive =
      storeRef.current.activeId === id ? undefined : storeRef.current.activeId;
    storeRef.current = { templates: next, activeId: nextActive };
    saveStore(storeRef.current);
  }, []);

  const resetTemplates = useCallback(() => {
    storeRef.current = { templates: [], activeId: undefined };
    saveStore(storeRef.current);
  }, []);

  const setTemplateActive = useCallback((id: string) => {
    storeRef.current = { ...storeRef.current, activeId: id || undefined };
    saveStore(storeRef.current);
  }, []);

  const context = useMemo(() => {
    return {
      getTemplate,
      setTemplate,
      setTemplateActive,
      getTemplates,
      resetTemplates,
      delTemplate,
    };
  }, [
    getTemplate,
    setTemplate,
    setTemplateActive,
    getTemplates,
    resetTemplates,
    delTemplate,
  ]);

  return (
    <FileTemplatesContext.Provider value={context}>
      {children}
    </FileTemplatesContext.Provider>
  );
};
