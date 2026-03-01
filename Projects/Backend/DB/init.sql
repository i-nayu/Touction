CREATE TABLE Identify (
    UserID        VARCHAR(255) PRIMARY KEY,
    Address       VARCHAR(255) NOT NULL
);

CREATE TABLE Mosaic (
    MosaicID    VARCHAR(255) PRIMARY KEY,
    MosaicName  VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE Photos (
    UserID        VARCHAR(255) PRIMARY KEY,
    PhotoPath     VARCHAR(255),
    comment       TEXT
);

