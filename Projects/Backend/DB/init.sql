CREATE TABLE Identify (
    UserID VARCHAR(255) PRIMARY KEY,
    Address VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Mosaic (
    MosaicID VARCHAR(255) NOT NULL PRIMARY KEY,
    CreateTime DATETIME NOT NULL, -- トーナメント作成日時
    ExpireTime DATETIME NOT NULL -- トーナメント終了日時
);
CREATE TABLE Photos (
    PhotoID INT AUTO_INCREMENT PRIMARY KEY,
    UserID VARCHAR(255),
    PhotoPath VARCHAR(500),
    Comment TEXT,
    BidUserID VARCHAR(255),   -- 現在の最高入札者
    Amount INT,           -- 現在の最高額
    FOREIGN KEY (UserID) REFERENCES Identify(UserID),
    FOREIGN KEY (MaxBidUserID) REFERENCES Identify(UserID)

);

CREATE TABLE Vote (
    UserID VARCHAR(255) PRIMARY KEY,
    FOREIGN KEY (UserID) REFERENCES Identify(UserID),
    Vote BOOLEAN NOT NULL DEFAULT TRUE
);

