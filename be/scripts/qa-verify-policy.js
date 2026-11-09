/**
 * QA Automation Script for UC-59 Policy Management & User Consent Verification
 * Run: node be/scripts/qa-verify-policy.js
 */
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');
const { Policy, UserConsent } = require('../src/modules/policy/policy.model.js');
const User = require('../src/modules/users/user.model.js');
const policyService = require('../src/modules/policy/policy.service.js');
const { seedPolicies } = require('../src/seed/policy.seed.js');

async function runQATestSuite() {
  console.log('===============================================================');
  console.log('   QA TEST SUITE: UC-59 Policy Management & User Consent       ');
  console.log('===============================================================\n');

  await connectDB();

  try {
    // 1. Preparation: Find test accounts
    console.log('[1/5] CHUẨN BỊ MÔI TRƯỜNG TEST:');
    let testUser = await User.findOne({ email: 'customer1.demo@homecare.local' });
    if (!testUser) {
      testUser = await User.findOne({ role: 'CUSTOMER' });
    }
    if (!testUser) {
      testUser = await User.create({
        email: 'qa.test.customer@homecare.local',
        password: 'Password123!',
        fullName: 'QA Test Customer',
        phone: '0901234567',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
      });
      console.log('  + Tạo mới user test:', testUser.email);
    } else {
      console.log('  + Sử dụng user test có sẵn:', testUser.email, `(Role: ${testUser.role})`);
    }

    // Clean up test policies & consents
    await Policy.deleteMany({});
    await UserConsent.deleteMany({});
    console.log('  + Đã làm sạch (clear) bảng `policies` và `userconsents`. [PASS]\n');

    // 2. Kịch bản 2.1: Admin tạo & cập nhật phiên bản chính sách (Version Control)
    console.log('[2/5] KỊCH BẢN 2.1: Admin tạo và cập nhật phiên bản chính sách:');
    // Bước 1: Tạo v1.0
    const policyV1 = await policyService.createPolicy({
      title: 'Chính sách bảo mật dữ liệu người dùng',
      type: 'PRIVACY_POLICY',
      content: '<p>Nội dung chính sách bảo mật v1.0 với các điều khoản bảo vệ thông tin...</p>',
      version: 'v1.0',
      isMandatory: true,
      isActive: true,
      summary: 'Phiên bản ban đầu năm 2026',
    });
    console.log(`  - Bước 1 (Tạo v1.0): ID=${policyV1._id}, Version=${policyV1.version}, isActive=${policyV1.isActive}`);
    if (policyV1.version !== 'v1.0' || !policyV1.isActive) {
      throw new Error('Bước 1 thất bại: Policy v1.0 không được tạo đúng trạng thái isActive=true');
    }
    console.log('    => Kết quả: [PASS]');

    // Bước 2: Tạo v2.0
    const policyV2 = await policyService.createPolicy({
      title: 'Chính sách bảo mật dữ liệu người dùng cập nhật',
      type: 'PRIVACY_POLICY',
      content: '<p>Nội dung chính sách bảo mật v2.0 bổ sung điều khoản GDPR & bảo vệ dữ liệu cá nhân...</p>',
      version: 'v2.0',
      isMandatory: true,
      isActive: true,
      summary: 'Cập nhật lớn bổ sung tuân thủ quy định mới',
    });
    console.log(`  - Bước 2 (Tạo v2.0): ID=${policyV2._id}, Version=${policyV2.version}, isActive=${policyV2.isActive}`);

    // Kiểm tra v1.0 đã tự động chuyển sang isActive: false chưa
    const refreshedV1 = await Policy.findById(policyV1._id);
    console.log(`  - Kiểm tra v1.0 cũ: Version=${refreshedV1.version}, isActive=${refreshedV1.isActive}`);
    if (refreshedV1.isActive !== false) {
      throw new Error('Bước 2 thất bại: Policy v1.0 vẫn còn isActive=true khi v2.0 được kích hoạt');
    }
    console.log('    => Kết quả Version Control: [PASS] (v2.0 active, v1.0 tự động chuyển inactive)\n');

    // 3. Kịch bản 2.2: Luồng kiểm tra đồng ý (Check Consent) của User
    console.log('[3/5] KỊCH BẢN 2.2: Luồng kiểm tra đồng ý (Check Consent) của User:');
    // Bước 1: Check pending consent
    const check1 = await policyService.getPendingConsentsForUser(testUser);
    console.log(`  - Bước 1 (User chưa đồng ý): required=${check1.required}, pendingCount=${check1.pendingCount}`);
    const foundV2 = check1.policies.some((p) => p._id.toString() === policyV2._id.toString());
    if (!check1.required || !foundV2) {
      throw new Error('Bước 1 thất bại: check-consent không trả về policy v2.0 bắt buộc');
    }
    console.log('    => Danh sách pending chứa v2.0: [PASS]');

    // Bước 2: Ghi nhận đồng ý kèm IP thật
    const testIp = '113.161.45.88'; // Giả lập IP mạng VN
    const testUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QA-Test/1.0';
    console.log(`  - Bước 2 (Ghi nhận đồng ý): Gửi consent cho policyId=${policyV2._id}, IP=${testIp}`);
    const recorded = await policyService.recordConsents({
      userId: testUser,
      policyIds: [policyV2._id],
      ipAddress: testIp,
      userAgent: testUserAgent,
    });

    const consentInDb = await UserConsent.findOne({ user: testUser._id, policy: policyV2._id });
    if (!consentInDb) {
      throw new Error('Bước 2 thất bại: Bảng UserConsent không lưu được bản ghi');
    }
    console.log(`    + UserConsent record: id=${consentInDb._id}, ipAddress=${consentInDb.ipAddress}, acceptedAt=${consentInDb.acceptedAt.toISOString()}`);
    if (consentInDb.ipAddress !== testIp) {
      throw new Error(`Bước 2 thất bại: IP không khớp (kỳ vọng: ${testIp}, thực tế: ${consentInDb.ipAddress})`);
    }
    console.log('    => Kết quả ghi nhận consent: [PASS]');

    // Bước 3: Kiểm tra lại check-consent
    const check2 = await policyService.getPendingConsentsForUser(testUser);
    console.log(`  - Bước 3 (Kiểm tra lại sau khi đồng ý): required=${check2.required}, pendingCount=${check2.pendingCount}`);
    if (check2.required !== false || check2.policies.length !== 0) {
      throw new Error('Bước 3 thất bại: check-consent vẫn còn policy chưa đồng ý sau khi submit');
    }
    console.log('    => Kết quả check-consent trả về mảng rỗng []: [PASS]\n');

    // 4. EDGE CASES
    console.log('[4/5] EDGE CASES:');
    // Edge case 1: Nhiều policy cùng lúc
    console.log('  - Edge case 1: Tạo đồng thời cả TERMS_OF_SERVICE mới');
    const termsV1 = await policyService.createPolicy({
      title: 'Điều khoản dịch vụ HomeCare',
      type: 'TERMS_OF_SERVICE',
      content: '<p>Nội dung điều khoản dịch vụ...</p>',
      version: 'v1.0',
      isMandatory: true,
      isActive: true,
    });
    const checkMultiple = await policyService.getPendingConsentsForUser(testUser);
    console.log(`    + Đang cần consent mới: ${checkMultiple.pendingCount} policy (${checkMultiple.policies.map((p) => p.type).join(', ')})`);
    if (checkMultiple.pendingCount !== 1 || checkMultiple.policies[0].type !== 'TERMS_OF_SERVICE') {
      throw new Error('Edge case thất bại: không phát hiện đúng TERMS_OF_SERVICE mới');
    }
    console.log('    => Kết quả phát hiện chính sách đa loại: [PASS]');

    // Consent nốt termsV1
    await policyService.recordConsents({
      userId: testUser,
      policyIds: [termsV1._id],
      ipAddress: '127.0.0.1',
      userAgent: 'QA-Client',
    });

    // Edge case 2: Khách vãng lai (Guest) xem public
    const publicPolicies = await policyService.getActivePolicies();
    console.log(`  - Edge case 2: Guest user gọi public active policies: lấy được ${publicPolicies.length} chính sách`);
    if (publicPolicies.length < 2) {
      throw new Error('Edge case thất bại: Khách vãng lai không lấy được active policies');
    }
    console.log('    => Kết quả truy cập Guest: [PASS]\n');

    // 5. Khôi phục dữ liệu Seed ban đầu
    console.log('[5/5] KHÔI PHỤC DỮ LIỆU SEED BAN ĐẦU:');
    await seedPolicies();
    console.log('  + Đã khôi phục 3 chính sách chuẩn (v1.0) cho dev và UI testing. [DONE]\n');

    console.log('===============================================================');
    console.log('   🎉 TẤT CẢ KỊCH BẢN BACKEND ĐÃ PASS 100% HOÀN HẢO!           ');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ QA TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runQATestSuite();
