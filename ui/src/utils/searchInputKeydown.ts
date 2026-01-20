export type SearchFindInputKeydown = {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
};

export type SearchFindInputKeydownResult = {
  handled: boolean;
  preventDefault: boolean;
  stopPropagation: boolean;
};

export function handleSearchFindInputKeydown(
  e: SearchFindInputKeydown,
  actions: { next: () => void; prev: () => void }
): SearchFindInputKeydownResult {
  if (e.isComposing) {
    return { handled: false, preventDefault: false, stopPropagation: false };
  }

  if (e.key !== 'Enter') {
    return { handled: false, preventDefault: false, stopPropagation: false };
  }

  if (e.shiftKey) {
    actions.prev();
  } else {
    actions.next();
  }

  return { handled: true, preventDefault: true, stopPropagation: true };
}

