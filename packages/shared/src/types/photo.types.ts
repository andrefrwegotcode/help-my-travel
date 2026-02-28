export interface Photo {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  url: string;
  caption: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

export interface UploadPhotoDto {
  placeId: string;
  placeName: string;
  caption?: string;
}
