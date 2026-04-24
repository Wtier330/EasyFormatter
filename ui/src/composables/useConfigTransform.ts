import { ref } from 'vue';

export function useConfigTransform() {
  const transformRequest = ref<string | null>(null);
  const transformResult = ref<string | null>(null);
  const transformMode = ref<string | null>(null);

  function clearTransformResult() {
    transformResult.value = null;
    transformMode.value = null;
  }

  function setTransformRequest(mode: string) {
    transformRequest.value = mode;
  }

  function clearTransformRequest() {
    transformRequest.value = null;
  }

  return {
    transformRequest,
    transformResult,
    transformMode,
    clearTransformResult,
    setTransformRequest,
    clearTransformRequest
  };
}
