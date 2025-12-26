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
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { TS } from '-/tagspaces.namespace';

type WorkSpacesContextData = TS.WorkSpacesContextData;

export const WorkSpacesContext = createContext<WorkSpacesContextData>({
  getWorkSpace: undefined,
  setWorkSpace: undefined,
  delWorkSpace: undefined,
  getWorkSpaces: undefined,
  setCurrentWorkSpaceId: undefined,
  getCurrentWorkSpace: undefined,
  openNewWorkspaceDialog: undefined,
});

export type WorkSpacesContextProviderProps = {
  children: React.ReactNode;
};

const storageKey = 'TS_WORKSPACES_V1';
const currentIdKey = 'TS_WORKSPACES_CURRENT_ID_V1';

function loadWorkSpaces(): TS.WorkSpace[] {
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

function saveWorkSpaces(workSpaces: TS.WorkSpace[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workSpaces));
  } catch {
    // ignore
  }
}

function loadCurrentId(): string {
  try {
    return localStorage.getItem(currentIdKey) || '';
  } catch {
    return '';
  }
}

function saveCurrentId(id: string) {
  try {
    if (id) localStorage.setItem(currentIdKey, id);
    else localStorage.removeItem(currentIdKey);
  } catch {
    // ignore
  }
}

export const WorkSpacesContextProvider = ({
  children,
}: WorkSpacesContextProviderProps) => {
  const workSpaces = useRef<TS.WorkSpace[]>(loadWorkSpaces());
  const currentId = useRef<string>(loadCurrentId());
  const [ignored, forceUpdate] = useReducer((x) => x + 1, 0, undefined);

  const getWorkSpaces = useCallback(() => {
    return workSpaces.current;
  }, []);

  const getWorkSpace = useCallback((id: string) => {
    if (!id) return undefined;
    return workSpaces.current.find((w) => w.uuid === id);
  }, []);

  const setWorkSpace = useCallback((wSpace: TS.WorkSpace) => {
    if (!wSpace || !wSpace.uuid) return;
    const next = workSpaces.current.filter((w) => w.uuid !== wSpace.uuid);
    next.unshift(wSpace);
    workSpaces.current = next;
    saveWorkSpaces(next);
    forceUpdate();
  }, []);

  const delWorkSpace = useCallback((id: string) => {
    if (!id) return;
    workSpaces.current = workSpaces.current.filter((w) => w.uuid !== id);
    if (currentId.current === id) {
      currentId.current = '';
      saveCurrentId('');
    }
    saveWorkSpaces(workSpaces.current);
    forceUpdate();
  }, []);

  const setCurrentWorkSpaceId = useCallback((wSpaceId: string) => {
    currentId.current = wSpaceId || '';
    saveCurrentId(currentId.current);
    forceUpdate();
  }, []);

  const getCurrentWorkSpace = useCallback(() => {
    if (!currentId.current) return undefined;
    return workSpaces.current.find((w) => w.uuid === currentId.current);
  }, []);

  const openNewWorkspaceDialog = useCallback(
    (workSpace?: TS.WorkSpace) => {
      if (workSpace && workSpace.uuid) {
        setWorkSpace(workSpace);
        setCurrentWorkSpaceId(workSpace.uuid);
      }
    },
    [setWorkSpace, setCurrentWorkSpaceId],
  );

  const context = useMemo(() => {
    return {
      getWorkSpace,
      setWorkSpace,
      delWorkSpace,
      getWorkSpaces,
      setCurrentWorkSpaceId,
      getCurrentWorkSpace,
      openNewWorkspaceDialog,
    };
  }, [
    ignored,
    getWorkSpace,
    setWorkSpace,
    delWorkSpace,
    getWorkSpaces,
    setCurrentWorkSpaceId,
    getCurrentWorkSpace,
    openNewWorkspaceDialog,
  ]);

  return (
    <WorkSpacesContext.Provider value={context}>
      {children}
    </WorkSpacesContext.Provider>
  );
};
