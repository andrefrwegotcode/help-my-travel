export interface Review {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  rating: number; // 1-5
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

export interface CreateReviewDto {
  placeId: string;
  placeName: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}
