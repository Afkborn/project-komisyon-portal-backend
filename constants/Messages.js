//USER
exports.USER_NOT_FOUND = "Kullanıcı bulunamadı";
exports.LOGIN_SUCCESSFUL = "Giriş Başarılı";
exports.USER_CREATED_SUCCESSFULLY =
  "Kullanıcı başarılı bir şekilde oluşturuldu.";
exports.USER_CREATE_FAILED = "Kullanıcı oluşturulamadı";
exports.USERNAME_REQUIRED = "Kullanıcı adı zorunludur";
exports.PASSWORD_REQUIRED = "Şifre zorunludur";
exports.USERNAME_EXIST = "Kullanıcı adı mevcut";
exports.PASSWORD_INCORRECT = "Şifre yanlış";
exports.NAME_REQUIRED = "İsim zorunludur";
exports.SURNAME_REQUIRED = "Soyisim zorunludur";
exports.USER_NOT_AUTHORIZED = "Kullanıcı yetkili değil";
exports.PASSWORD_CHANGED = "Şifre değiştirildi";
exports.PASSWORD_NOT_CHANGED = "Şifre değiştirilemedi";
exports.USER_NOT_UPDATED = "Kullanıcı güncellenemedi";
exports.USER_UPDATED = "Kullanıcı güncellendi";
exports.USER_NOT_DELETED = "Kullanıcı silinemedi";
exports.USER_DELETED = "Kullanıcı silindi";
exports.TOKEN_NOT_FOUND = "Token bulunamadı";
exports.ROLE_REQUIRED = "Rol zorunludur";
exports.USERS_LIST = "Kullanıcılar başarılı bir şekilde listelendi!";
exports.USERS_NOT_FOUND = "Kullanıcılar bulunamadı";
exports.USERS_GET_FAILED = "Kullanıcılar getirilemedi";

//COMPONENTS
exports.INSTITUTIONID_REQUIRED = "Kurum ID zorunludur";
exports.INSTITUTIONNAME_REQUIRED = "Kurum adı zorunludur";
exports.UNIT_TYPE_REQUIRED = "Kurum tipi zorunludur";
exports.UNIT_NAME_REQUIRED = "Kurum adı zorunludur";
exports.UNIT_NAME_EXIST = "Kurum adı mevcut";
exports.UNIT_ID_REQUIRED = "Kurum ID zorunludur";

//UNIT
exports.UNITS_NOT_FOUND = "Birimler bulunamadı";
exports.UNIT_TYPE_NOT_FOUND = "Birim tipi bulunamadı";
exports.UNIT_NOT_FOUND = "Birim bulunamadı";
exports.UNIT_DELETED = "Birim silindi";
exports.UNIT_NOT_DELETED = "Birim silinemedi";
exports.UNIT_UPDATED = "Birim güncellendi";
exports.UNIT_NOT_UPDATED = "Birim güncellenemedi";
exports.UNIT_NOT_SAVED = "Birim kaydedilemedi";
exports.UNIT_NOT_DELETABLE_REASON_PERSON =
  "Birimde görevli var, birim silinemez";

// PERSON
exports.PERSON_SICIL_REQUIRED = "Sicil numarası zorunludur";
exports.PERSON_NAME_REQUIRED = "İsim zorunludur";
exports.PERSON_SURNAME_REQUIRED = "Soyisim zorunludur";
exports.PERSON_GOREVE_BASLAMA_TARIHI_REQUIRED =
  "Göreve başlama tarihi zorunludur";
exports.BIRIME_BASLAMA_TARIHI_REQUIRED = "Birime başlama tarihi zorunludur";
exports.PERSON_NOT_FOUND = "Görevli bulunamadı";
exports.PERSON_DELETED = "Görevli silindi";
exports.PERSON_UPDATED = "Görevli güncellendi";
exports.PERSON_NOT_UPDATED = "Görevli güncellenemedi";
exports.PERSON_NOT_DELETED = "Görevli silinemedi";
exports.PERSONS_NOT_FOUND = "Görevliler bulunamadı";
exports.PERSON_NOT_SAVED = "Görevli kaydedilemedi";
exports.VALID_SICIL = (VALUE) => `Sicil numarası hatalı. Sicil: ${VALUE}`;
exports.VALID_TCKN = (VALUE) => `TCKN hatalı. TCKN: ${VALUE}`;
exports.VALID_PHONE = (VALUE) => `Telefon numarası hatalı. Telefon: ${VALUE}`;
exports.PERSON_SICIL_UNIQUE = "Sicil numarası benzersiz olmalıdır";
// PERSON UNİT

// LEAVE
exports.LEAVE_NOT_FOUND = "İzin bulunamadı";
exports.LEAVE_DELETED = "İzin silindi";
exports.LEAVE_NOT_DELETED = "İzin silinemedi";
exports.LEAVE_NOT_UPDATED = "İzin güncellenemedi";
exports.END_DATE_REQUIRED = "Bitiş tarihi zorunludur";
exports.LEAVES_NOT_FOUND = "İzinler bulunamadı";
exports.LEAVE_NOT_SAVED = "İzin kaydedilemedi";
exports.PERSON_ID_REQUIRED = "Personel ID zorunludur";
exports.REASON_REQUIRED = "İzin Tipi zorunludur";

// COMMON
exports.REQUIRED_FIELD = "alanı zorunludur";

// TİTLE
exports.TITLE_NAME_REQUIRED = "Ünvan adı zorunludur";
exports.TITLE_NOT_DELETED = "Ünvan silinemedi";
exports.TITLE_DELETED = "Ünvan silindi";
exports.TITLE_NOT_DELETABLE = "Ünvan silinemez";
exports.TITLE_NOT_UPDATED = "Ünvan güncellenemedi";
exports.TITLE_NOT_FOUND = "Ünvan bulunamadı";
exports.TITLE_UPDATED = "Ünvan güncellendi";
exports.TITLE_DELETABLE_NOT_UPDATED = "Ünvan silinme durumu güncellenemez.";
exports.TITLE_NOT_SAVED = "Ünvan kaydedilemedi";
exports.TITLE_HAS_PERSON = "Ünvan görevliye atanmış, silinemez";
exports.TITLE_NOT_DELETABLE_REASON_PERSON = "Ünvan görevliye atanmış, silinemez";

// Redis ve Auth için yeni mesajlar
module.exports.LOGOUT_SUCCESSFUL = "Başarıyla çıkış yapıldı";
module.exports.TOO_MANY_ATTEMPTS = "Çok fazla başarısız giriş denemesi";
module.exports.ACCOUNT_LOCKED = "Hesabınız geçici olarak kilitlendi";
module.exports.SERVER_ERROR = "Sunucu hatası oluştu";
module.exports.PASSWORD_CHANGED_LOGIN_REQUIRED = "Şifreniz başarıyla değiştirildi. Tüm cihazlarda yeniden giriş yapmanız gerekecek.";
module.exports.TOKEN_EXPIRED = "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.";

