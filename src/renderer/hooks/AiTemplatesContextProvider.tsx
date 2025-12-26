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

type AiTemplatesContextData = TS.AiTemplatesContextData;

export const AiTemplatesContext = createContext<AiTemplatesContextData>({
  getTemplate: undefined,
  getDefaultTemplate: undefined,
  setTemplate: undefined,
});

export type AiTemplatesContextProviderProps = {
  children: React.ReactNode;
};

const storageKey = 'TS_AI_TEMPLATES_V1';

type TemplateStore = Record<string, string>;

function loadStore(): TemplateStore {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveStore(store: TemplateStore) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export const AiTemplatesContextProvider = ({
  children,
}: AiTemplatesContextProviderProps) => {
  const storeRef = useRef<TemplateStore>(loadStore());

  const getDefaultTemplate = useCallback((key: string) => {
    return '';
  }, []);

  const getTemplate = useCallback(
    (key: string) => {
      if (!key) return '';
      return storeRef.current[key] ?? getDefaultTemplate(key);
    },
    [getDefaultTemplate],
  );

  const setTemplate = useCallback((key: string, value: string) => {
    if (!key) return;
    storeRef.current = { ...storeRef.current, [key]: value ?? '' };
    saveStore(storeRef.current);
  }, []);

  const context = useMemo(() => {
    return {
      getTemplate,
      getDefaultTemplate,
      setTemplate,
    };
  }, [getTemplate, getDefaultTemplate, setTemplate]);

  return (
    <AiTemplatesContext.Provider value={context}>
      {children}
    </AiTemplatesContext.Provider>
  );
};
