INSERT INTO users (id, username, email) VALUES ('1','jovanhn', 'subi@sub-soft.com');
INSERT INTO vehicles(id, model, user_id) VALUES ('1', 'BMW', '1');
INSERT INTO vehicles(id, model, user_id) VALUES ('2', 'Vespa', '1');

INSERT INTO events(id, vehicle_id, type, title) VALUES ('1','1','Purchase', 'Bought car from user xyxyxy');
--INSERT INTO used_by(user_id, vehicle_id, status) VALUES ('1','1','active');