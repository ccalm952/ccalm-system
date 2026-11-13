export type FeeItem = {
  id: number;
  categoryId: number;
  name: string;
  price: number;
};

export type FeeCategory = {
  id: number;
  name: string;
  items: FeeItem[];
};
