<script setup lang="ts">
import ImagesList from './components/ImagesList.vue';
import * as imagesAPI from './api/images';
import { onMounted, ref } from 'vue';
import type { Image } from './types/image';

const images = ref<Image[]>([]);
const errorMessage = ref('');
const isLoading = ref(false);

onMounted(async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    images.value = await imagesAPI.getImages();
  } catch (error) {
    errorMessage.value = 'Unable to load images'
  } finally {
    isLoading.value = false;
  }
})
</script>

<template>
  <main>
    <section class="carousel">
      <div class="container">
        <h1 class="carousel__title">Carousel of Images</h1>

        <div v-if="isLoading" class="loader">
          <div class="loader__content"></div>
        </div>

        <div v-else-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <ImagesList v-else :images="images"/>
      </div>
    </section>
  </main>
</template>
