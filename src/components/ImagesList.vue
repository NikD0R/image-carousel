<script setup lang="ts">
import type { Image } from '../types/image';
import ImageCarousel from './ImageCarousel.vue';

defineProps<{ images: Image[] }>();
</script>

<template>
  <div class="carousel__wrapper">
    <ImageCarousel :images="images" />
  </div>
</template>
