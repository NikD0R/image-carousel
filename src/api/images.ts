import { client } from "../utils/http"


export const getImages = async (limit = 40) => {
  const response = await client.get('/v2/list', {
    params: {
      limit: limit
    }
  });

  return response.data;
}