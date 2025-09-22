// Debug the stats database issue
const { UserService } = require('./dist/services/UserService');
const { DatabaseService } = require('./dist/database/DatabaseService');

async function debugStats() {
  console.log('🔍 デバッグ：統計データベースの問題を調査します...\n');

  const db = DatabaseService.getInstance();
  await db.initialize();
  const userService = new UserService();

  // Create a test user
  const testUser = await userService.createUser('debuguser', 'pass123');
  console.log('✅ テストユーザー作成:', testUser.id);

  // Check initial stats in database
  console.log('\n📊 初期データベースの状態:');
  const initialUserStats = db.get('SELECT * FROM user_stats WHERE user_id = ?', [testUser.id]);
  const initialPongStats = db.get('SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?', [testUser.id, 'pong']);
  console.log('初期user_stats:', initialUserStats);
  console.log('初期pong_stats:', initialPongStats);

  // Manually update stats
  console.log('\n🔄 統計を手動で更新...');
  userService.updateUserStats(testUser.id, 'pong', true);

  // Check updated stats in database
  console.log('\n📈 更新後のデータベースの状態:');
  const updatedUserStats = db.get('SELECT * FROM user_stats WHERE user_id = ?', [testUser.id]);
  const updatedPongStats = db.get('SELECT * FROM game_type_stats WHERE user_id = ? AND game_type = ?', [testUser.id, 'pong']);
  console.log('更新後user_stats:', updatedUserStats);
  console.log('更新後pong_stats:', updatedPongStats);

  // Check what getUserById returns
  console.log('\n👤 getUserByIdが返す内容:');
  const retrievedUser = userService.getUserById(testUser.id);
  console.log('取得したユーザー統計:', retrievedUser?.stats);

  console.log('\n🔍 診断完了');
}

debugStats().catch(console.error);