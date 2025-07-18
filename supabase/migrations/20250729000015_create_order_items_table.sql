CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  item_name text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  unit text
);
