Adliye Yönetim Sistemi 

Bu proje, Eskişehir Adliyesi personelinin işlemlerini kolaylaştırmak ve hızlandırmak amacıyla geliştirilmiş bir web uygulamasıdır.

## Proje Hakkında

Adliye Yönetim Sistemi, adliye personelinin günlük işlemlerini kolaylaştırmak ve hızlandırmak amacıyla geliştirilmiş bir uygulamadır. Bu API, ön yüz uygulamasına hizmet vererek temel işlevleri yerine getirmektedir.

## Amaç

- Adliye personeline iş süreçlerinde destek olmak
- Belge ve dosya yönetimini kolaylaştırmak
- İşlemleri hızlandırmak ve verimliliği artırmak
- Verilerin güvenli bir şekilde saklanmasını sağlamak

## Kullanılan Teknolojiler

- **Node.js**: Sunucu tarafı JavaScript çalıştırma ortamı
- **Express.js**: Web API framework
- **MongoDB**: NoSQL veritabanı
- **Redis**: Önbellek yönetimi ve oturum işlemleri için
- **JWT**: JSON Web Token tabanlı kimlik doğrulama
- **Docker**: Konteynerizasyon ve dağıtım
- **Mongoose**: MongoDB ODM (Object Document Mapper)

## API Özellikleri

- Kullanıcı kimlik doğrulama ve yetkilendirme
- Dosya ve belge yönetimi
- Komisyon ve görev yönetimi
- Personel işlemleri
- Raporlama ve istatistikler

## Kurulum

## Gereksinimler

- Node.js (v14 veya üstü)
- MongoDB
- Redis (opsiyonel)
- Docker (opsiyonel)

## Kurulum Adımları

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. .env dosyasını oluşturun (örnek .env.example dosyasını kullanabilirsiniz):
```bash
cp .env.example .env
```

3. Uygulamayı başlatın:
```bash
npm start
```


## Lisans

Bu proje Eskişehir Adliyesi için özel olarak geliştirilmiştir.