<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Image } from '../types/image';

const props = defineProps<{ images: Image[] }>();
const STORAGE_KEY = 'selected-images';

const visibleCount = ref(3);

const calcVisible = () => {
  const w = window.innerWidth;
  if (w < 640) return 1;
  if (w < 1024) return 2;
  if (w < 1440) return 3;
  return 4;
};

const onResize = () => {
  visibleCount.value = calcVisible();
};

onMounted(() => {
  visibleCount.value = calcVisible();
  window.addEventListener('resize', onResize);

  const savedImages = localStorage.getItem(STORAGE_KEY);
  if (savedImages) {
    try {
      const urls = JSON.parse(savedImages);
      if (Array.isArray(urls)) {
        selected.value = new Set(urls.filter((u): u is string => typeof u === 'string'));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
});

onUnmounted(() => window.removeEventListener('resize', onResize));

const n = computed(() => props.images.length);

const extended = computed(() =>
  n.value > 0 ? [...props.images, ...props.images, ...props.images] : []
);

const total = computed(() => extended.value.length);

const offset = ref(0);
watch(n, (len) => {
  if (len > 0) offset.value = len;
}, { immediate: true });

const animated = ref(true);

const trackStyle = computed(() => {
  if (total.value === 0) return {};
  const totalWidth = (total.value / visibleCount.value) * 100;
  const tx = (-offset.value / total.value) * 100;
  return {
    width: `${totalWidth}%`,
    transform: `translateX(${tx}%)`,
    transition: animated.value
      ? 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none',
  };
});

const itemWidth = computed(() =>
  total.value > 0 ? `${100 / total.value}%` : '0%'
);


const navigate = (dir: 1 | -1) => {
  if (n.value === 0) return;
  animated.value = true;
  offset.value += dir;
};

const onTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== 'transform') return;
  const len = n.value;

  if (offset.value < len || offset.value >= len * 2) {
    animated.value = false;
    offset.value = offset.value < len
      ? offset.value + len
      : offset.value - len;

    requestAnimationFrame(() =>
      requestAnimationFrame(() => { animated.value = true; })
    );
  }
};

const selected = ref<Set<string>>(new Set());

const clearSelected = () => {
  selected.value = new Set();
  localStorage.removeItem(STORAGE_KEY);
};

watch(
  selected,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...value]));
  },
  { deep: true }
);

const toggle = (url: string) => {
  const s = new Set(selected.value);
  s.has(url) ? s.delete(url) : s.add(url);
  selected.value = s;
};

const isSelected = (url: string) => selected.value.has(url);
const selectedList = computed(() => [...selected.value]);
</script>

<template>
  <div class="image-carousel" v-if="images.length">
    <button class="image-carousel__btn image-carousel__btn--prev" @click="navigate(-1)" aria-label="Previous">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
        stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div class="image-carousel__viewport">
      <div class="image-carousel__track" :style="trackStyle" @transitionend="onTransitionEnd">
        <div v-for="(img, i) in extended" :key="`${img.id}-${i}`" class="image-carousel__item"
          :class="{ 'image-carousel__item--selected': isSelected(img.download_url) }" :style="{ width: itemWidth }"
          @click="toggle(img.download_url)">
          <div class="image-carousel__card">
            <img class="image-carousel__img" :src="img.download_url" :alt="`Photo by ${img.author}`" loading="lazy" />
            <div class="image-carousel__overlay">
              <span class="image-carousel__badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                  stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div class="image-carousel__author">{{ img.author }}</div>
          </div>
        </div>
      </div>
    </div>

    <button class="image-carousel__btn image-carousel__btn--next" @click="navigate(1)" aria-label="Next">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
        stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  </div>

  <Transition name="selected-section">
    <div class="selected" v-if="selectedList.length">
      <div class="selected__heading">
        <p class="selected__heading-title">
          selected
          <span class="selected__count">{{ selectedList.length }}</span>
        </p>
        <button v-if="selectedList.length" class="selected__clear" type="button" @click="clearSelected">
          Clear all
        </button>
      </div>

      <TransitionGroup name="selected-item" tag="ul" class="selected__list">
        <li v-for="url in selectedList" :key="url" class="selected__row">
          <img class="selected__thumb" :src="url" alt="" />
          <a class="selected__url" :href="url" target="_blank" rel="noopener">{{ url }}</a>
          <button class="selected__del" @click="toggle(url)" aria-label="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </li>
      </TransitionGroup>
    </div>
  </Transition>
</template>

<style scoped>
.image-carousel {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.image-carousel__viewport {
  flex: 1;
  overflow: hidden;
  border-radius: var(--radius);
}

.image-carousel__track {
  display: flex;
  will-change: transform;
}

.image-carousel__item {
  flex-shrink: 0;
  padding: 0 0.35rem;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
}

.image-carousel__card {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  aspect-ratio: 4 / 3;
  box-shadow: var(--shadow-sm);
  transition: box-shadow .25s ease, transform .25s ease;
}

.image-carousel__item:hover .image-carousel__card {
  box-shadow: var(--shadow-md);
  transform: translateY(-3px);
}

.image-carousel__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: filter .3s ease;
}

.image-carousel__overlay {
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background .25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-carousel__badge {
  width: 2.4rem;
  height: 2.4rem;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  opacity: 0;
  transform: scale(.5);
  transition: opacity .22s ease, transform .22s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
}

.image-carousel__badge svg {
  width: 1rem;
  height: 1rem;
}

.image-carousel__author {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem 0.7rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, .55));
  opacity: 0;
  transition: opacity .25s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: .02em;
}

.image-carousel__item:hover .image-carousel__author {
  opacity: 1;
}

.image-carousel__item--selected .image-carousel__overlay {
  background: rgba(232, 87, 42, .28);
}

.image-carousel__item--selected .image-carousel__badge {
  opacity: 1;
  transform: scale(1);
}

.image-carousel__item--selected .image-carousel__img {
  filter: brightness(.85) saturate(.9);
}

.image-carousel__item--selected .image-carousel__card {
  outline: 3px solid var(--accent);
  outline-offset: -3px;
}

.image-carousel__btn {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: #fff;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dark);
  transition: background .2s, box-shadow .2s, transform .15s, border-color .2s;
}

.image-carousel__btn:hover {
  background: #fff8f6;
  border-color: var(--accent-2);
  box-shadow: var(--shadow-md);
  transform: scale(1.06);
}

.image-carousel__btn:active {
  transform: scale(.95);
}

.image-carousel__btn svg {
  width: 1.2rem;
  height: 1.2rem;
  stroke: var(--accent);
}

.selected {
  border-top: 1.5px solid var(--border);
  padding-top: 1.5rem;
}

.selected__heading {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}

.selected__heading-title {
  font-size: .85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--mid);
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: .5rem;
}

.selected__count {
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6em;
  height: 1.6em;
  padding: 0.45em;
  font-size: .7rem;
  font-weight: 700;
  border-radius: 999px;
  line-height: 1.6em;
  box-sizing: border-box;
  flex-shrink: 0;
}

.selected__clear {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  padding: .2rem .4rem;
  border-radius: 999px;
  transition: background-color .15s, color .15s;
}

.selected__clear:hover {
  background-color: #fff1ed;
  color: var(--accent-2);
}

.selected__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  position: relative;
  /* needed for leave-active position:absolute */
}

.selected__row {
  display: flex;
  align-items: center;
  gap: .75rem;
  background: #fafafa;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: .45rem .7rem;
  transition: background-color .3s;
}

.selected__row:hover {
  background-color: #fff8f6;
  border-color: var(--accent-2);
}

.selected__thumb {
  width: 2.75rem;
  height: 2.75rem;
  object-fit: cover;
  border-radius: calc(var(--radius) - .15rem);
  flex-shrink: 0;
}

.selected__url {
  font-size: .78rem;
  color: var(--mid);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-decoration: none;
  transition: color .15s;
}

.selected__url:hover {
  color: var(--accent);
}

.selected__del {
  flex-shrink: 0;
  width: 1.65rem;
  height: 1.65rem;
  border: none;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .15s, transform .15s;
}

.selected__del:hover {
  background: #fecaca;
  transform: scale(1.1);
}

.selected__del svg {
  width: .8rem;
  height: .8rem;
}

.selected-item-enter-active {
  transition: opacity .3s ease, transform .3s ease;
}

.selected-item-leave-active {
  transition: opacity .22s ease, transform .22s ease;
  position: absolute;
  width: 100%;
}

.selected-item-move {
  transition: transform .3s ease;
}

.selected-item-enter-from {
  opacity: 0;
  transform: translateX(-1.25rem);
}

.selected-item-leave-to {
  opacity: 0;
  transform: translateX(1.25rem);
}

.selected-section-enter-active {
  transition: opacity .35s ease, transform .35s ease;
}

.selected-section-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}

.selected-section-enter-from {
  opacity: 0;
  transform: translateY(.75rem);
}

.selected-section-leave-to {
  opacity: 0;
  transform: translateY(.5rem);
}

@media (max-width: 639px) {
  .image-carousel__btn {
    width: 2.2rem;
    height: 2.2rem;
  }

  .image-carousel__btn svg {
    width: 1rem;
    height: 1rem;
  }

  .image-carousel__item {
    padding: 0 .2rem;
  }
}
</style>