const mongoose = require('mongoose');
const User = require('../model/User');
require('dotenv').config();

async function migrateRoles() {
  try {
    const connectionString = process.env.MONGO_DB_CONNECTION;
    
    if (!connectionString) {
      throw new Error('MONGO_DB_CONNECTION bulunamadı! Lütfen .env dosyasını kontrol edin.');
    }

    console.log('MongoDB bağlantısı başlatılıyor...');
    await mongoose.connect(connectionString);
    console.log('MongoDB bağlantısı başarılı.');
    
    const users = await User.find({});
    console.log(`${users.length} kullanıcı bulundu.`);
    
    let migratedCount = 0;
    for (const user of users) {
      // Mevcut yapıyı görmek için log alalım
      console.log(`Checking user ${user.username}:`);
      console.log('- role:', user.role);
      console.log('- roles:', user.roles);

      if (user.role && !user.roles) {
        console.log(`Migrating user ${user.username} from role: ${user.role}`);
        user.roles = [user.role];
        delete user.role;
        await user.save();
        migratedCount++;
        console.log(`✓ Migrated user: ${user.username} (${migratedCount}/${users.length})`);
      } else if (!user.roles || user.roles.length === 0) {
        // Eğer roles yoksa veya boşsa, varsayılan rol ata
        console.log(`Adding default role to user ${user.username}`);
        user.roles = ['komisyonkatibi'];
        await user.save();
        migratedCount++;
        console.log(`✓ Added default role to: ${user.username} (${migratedCount}/${users.length})`);
      }
    }
    
    console.log(`\nMigration tamamlandı. ${migratedCount} kullanıcı güncellendi.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration hatası:', error.message);
    process.exit(1);
  }
}

migrateRoles();
