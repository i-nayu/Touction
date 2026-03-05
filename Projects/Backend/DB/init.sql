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
    FOREIGN KEY (UserID) REFERENCES Identify(UserID),
    PhotoPath VARCHAR(500),
    Comment TEXT,
    Amount INT
);
