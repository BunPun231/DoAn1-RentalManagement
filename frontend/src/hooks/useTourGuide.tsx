import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService, type OnboardingStatusResult } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourStep {
  stepNumber: number;
  title: string;
  description: string;
  targetPath: string;
  actionLabel: string;
  hint: string;
}

export const ONBOARDING_STEPS: TourStep[] = [
  {
    stepNumber: 1,
    title: "Tạo khu trọ đầu tiên",
    description: "Trước hết, bác cần tạo một khu trọ (nhà trọ) mới để dễ dàng quản lý các phòng trọ bên trong.",
    targetPath: "/motels",
    actionLabel: "Tới trang Khu trọ & Tạo",
    hint: "Nhấp vào nút 'Thêm khu trọ' và điền thông tin (tên, địa chỉ) khu trọ của bác.",
  },
  {
    stepNumber: 2,
    title: "Kích hoạt gạch nợ tự động SePay",
    description: "Cấu hình Ngân hàng & số tài khoản nhận tiền. Hệ thống sẽ tự động cấp một mã bảo mật Webhook Secret Key để đồng bộ dữ liệu giao dịch.",
    targetPath: "/motels",
    actionLabel: "Xem danh sách & Cấu hình ngân hàng",
    hint: "Nhấp vào biểu tượng Bánh răng (Cài đặt) trên thẻ Khu trọ, điền Số tài khoản và chọn ngân hàng, sau đó sao chép Webhook URL và Secret Key dán vào cấu hình SePay.vn.",
  },
  {
    stepNumber: 3,
    title: "Thêm danh sách phòng trọ",
    description: "Khởi tạo danh sách các phòng trọ cụ thể trong khu trọ để bắt đầu cho thuê.",
    targetPath: "/motels",
    actionLabel: "Vào chi tiết Khu trọ để Thêm phòng",
    hint: "Nhấp 'Chi tiết' khu trọ của bác, tìm mục danh sách phòng và nhấn 'Thêm phòng' (hoặc 'Thêm hàng loạt').",
  },
  {
    stepNumber: 4,
    title: "Lập hợp đồng thuê phòng",
    description: "Liên kết khách thuê vào phòng thông qua hợp đồng thuê để bắt đầu tính tiền phòng hàng tháng.",
    targetPath: "/contracts",
    actionLabel: "Tới trang Hợp đồng & Tạo mới",
    hint: "Nhấp 'Tạo hợp đồng mới', điền số điện thoại khách thuê, chọn phòng trọ, mức giá thuê và ngày bắt đầu hợp đồng.",
  },
  {
    stepNumber: 5,
    title: "Ghi chỉ số điện nước đầu kỳ",
    description: "Nhập chỉ số điện nước ban đầu làm căn cứ để tính toán tiền chênh lệch tiêu thụ vào cuối tháng.",
    targetPath: "/meter",
    actionLabel: "Tới trang Điện nước & Ghi số",
    hint: "Chọn khu trọ, nhập chỉ số Điện & Nước ban đầu (chỉ số cũ) của phòng trọ rồi lưu lại.",
  },
  {
    stepNumber: 6,
    title: "Lập hóa đơn & Quét QR thử nghiệm",
    description: "Xuất hóa đơn tháng đầu tiên, quét mã VietQR tự động để trải nghiệm luồng thanh toán gạch nợ tự động qua SePay.",
    targetPath: "/invoices",
    actionLabel: "Tới trang Hóa đơn & Lập hóa đơn",
    hint: "Nhấn 'Tạo hóa đơn', chọn phòng trọ và kỳ thanh toán. Sau khi tạo, nhấn vào hóa đơn để hiện mã VietQR động để quét.",
  },
];

export interface SubStep {
  id: string; // e.g. "1.1"
  stage: number;
  subStep: number;
  selector: string;
  title: string;
  description: string;
  targetPath: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const SUB_STEPS: SubStep[] = [
  // Chặng 1: Tạo khu trọ (Target: /motels)
  {
    id: "1.1",
    stage: 1,
    subStep: 1,
    selector: "#btn-add-motel",
    title: "Thêm khu trọ mới",
    description: "Bác bấm vào nút này để bắt đầu khai báo khu trọ đầu tiên nhé!",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "1.2",
    stage: 1,
    subStep: 2,
    selector: "#input-motel-name",
    title: "Nhập thông tin khu trọ",
    description: "Bác điền Tên khu trọ và Địa chỉ vào đây nhé.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "1.3",
    stage: 1,
    subStep: 3,
    selector: "#btn-submit-motel",
    title: "Lưu khu trọ",
    description: "Bác bấm 'Lưu' để hoàn thành tạo khu trọ. Hệ thống sẽ tự động tạo sẵn giá Điện và Nước mặc định cho bác!",
    targetPath: "/motels",
    position: "top"
  },
  // Chặng 2: Cấu hình SePay HMAC (Target: /motels)
  {
    id: "2.1",
    stage: 2,
    subStep: 1,
    selector: "#btn-edit-motel",
    title: "Cập nhật cấu hình",
    description: "Bác bấm vào nút Sửa này để mở cấu hình Ngân hàng và Webhook SePay nhé!",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "2.2",
    stage: 2,
    subStep: 2,
    selector: "#select-bank-name",
    title: "Chọn ngân hàng",
    description: "Bác nhấp vào đây và chọn ngân hàng bác đang sử dụng nhé.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "2.3",
    stage: 2,
    subStep: 3,
    selector: "#input-bank-account",
    title: "Nhập số tài khoản",
    description: "Bác điền chính xác số tài khoản ngân hàng nhận tiền của bác vào đây.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "2.4",
    stage: 2,
    subStep: 4,
    selector: "#input-account-holder",
    title: "Nhập tên chủ tài khoản",
    description: "Bác nhập tên chủ tài khoản (viết hoa không dấu, ví dụ: NGUYEN TRAN PHUONG) vào đây nhé.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "2.5",
    stage: 2,
    subStep: 5,
    selector: "#btn-show-webhook-guide",
    title: "Đăng nhập SePay.vn",
    description: "Bác truy cập SePay.vn. Xem hình hướng dẫn phía dưới để biết cách vào trang cấu hình Webhook trên SePay.vn nhé!",
    targetPath: "/motels",
    position: "top"
  },
  {
    id: "2.6",
    stage: 2,
    subStep: 6,
    selector: "#btn-copy-webhook-url",
    title: "Sao chép Webhook URL",
    description: "Bác bấm Sao chép để lấy đường dẫn Webhook. Giao diện sẽ tự động nhảy qua hình 2 để hướng dẫn bác dán vào SePay.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "2.7",
    stage: 2,
    subStep: 7,
    selector: "#btn-show-webhook-guide",
    title: "Chọn tài khoản nhận tiền",
    description: "Xem hình hướng dẫn phía dưới để chọn tài khoản ngân hàng nhận tiền trên SePay, rồi bấm Tiếp theo.",
    targetPath: "/motels",
    position: "top"
  },
  {
    id: "2.8",
    stage: 2,
    subStep: 8,
    selector: "#btn-copy-secret-key",
    title: "Sao chép Secret Key",
    description: "Bác sao chép tiếp Chữ ký bảo mật (Secret Key) này rồi dán vào ô 'Chữ ký bảo mật' trên SePay nhé.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "2.9",
    stage: 2,
    subStep: 9,
    selector: "#btn-show-webhook-guide",
    title: "Lưu webhook trên SePay",
    description: "Bác bấm 'Thêm' trên SePay.vn. Xem hình hướng dẫn phía dưới để đảm bảo webhook hoạt động chính xác.",
    targetPath: "/motels",
    position: "top"
  },
  {
    id: "2.10",
    stage: 2,
    subStep: 10,
    selector: "#btn-submit-motel",
    title: "Lưu cấu hình hệ thống",
    description: "Sau khi đã thêm webhook thành công, bác bấm nút Cập nhật này để lưu cấu hình vào hệ thống và hoàn thành chặng 2 nhé!",
    targetPath: "/motels",
    position: "top"
  },
  // Chặng 3: Tạo phòng trọ hàng loạt (Target: /motels)
  {
    id: "3.1",
    stage: 3,
    subStep: 1,
    selector: "#btn-bulk-create-rooms",
    title: "Tạo phòng hàng loạt",
    description: "Bác bấm vào đây để tạo nhanh nhiều phòng trọ cùng lúc, không cần nhập từng phòng mất công!",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "3.2",
    stage: 3,
    subStep: 2,
    selector: "#input-bulk-quantity",
    title: "Nhập thông tin số lượng",
    description: "Bác nhập số lượng phòng muốn tạo, giá thuê phòng và diện tích vào các ô này nhé.",
    targetPath: "/motels",
    position: "bottom"
  },
  {
    id: "3.3",
    stage: 3,
    subStep: 3,
    selector: "#btn-submit-bulk-rooms",
    title: "Hoàn tất tạo phòng",
    description: "Bác bấm nút này để hệ thống tự sinh tự động hàng loạt phòng trọ sạch sẽ!",
    targetPath: "/motels",
    position: "top"
  },
  // Chặng 4: Tạo hợp đồng & Thêm khách (Target: /contracts)
  {
    id: "4.1",
    stage: 4,
    subStep: 1,
    selector: "#btn-create-contract",
    title: "Tạo hợp đồng mới",
    description: "Bác bấm vào đây để làm hợp đồng cho khách thuê vào ở.",
    targetPath: "/contracts",
    position: "bottom"
  },
  {
    id: "4.2",
    stage: 4,
    subStep: 2,
    selector: "#select-contract-room",
    title: "Nhập thông tin khách thuê",
    description: "Bác chọn căn phòng vừa tạo, gõ tên và số điện thoại của người thuê vào đây nhé.",
    targetPath: "/contracts",
    position: "bottom"
  },
  {
    id: "4.3",
    stage: 4,
    subStep: 3,
    selector: "#btn-submit-contract",
    title: "Kích hoạt hợp đồng",
    description: "Bác bấm nút này để kích hoạt vòng đời hoạt động của phòng trọ.",
    targetPath: "/contracts",
    position: "top"
  },
  // Chặng 5: Ghi chỉ số đầu kỳ (Target: /meter)
  {
    id: "5.1",
    stage: 5,
    subStep: 1,
    selector: "#btn-open-meter-modal",
    title: "Ghi chỉ số",
    description: "Bác bấm vào nút Ghi chỉ số của phòng trọ để bắt đầu ghi nhận nhé!",
    targetPath: "/meter",
    position: "bottom"
  },
  {
    id: "5.2",
    stage: 5,
    subStep: 2,
    selector: "#input-electric-index-initial",
    title: "Nhập chỉ số điện nước",
    description: "Bác nhập số điện và số nước ban đầu khi khách mới dọn vào ở vào 2 ô này nhé.",
    targetPath: "/meter",
    position: "bottom"
  },
  {
    id: "5.3",
    stage: 5,
    subStep: 3,
    selector: "#btn-save-meter-readings",
    title: "Lưu chỉ số",
    description: "Bác bấm Lưu chỉ số để làm căn cứ tính tiền vào cuối tháng.",
    targetPath: "/meter",
    position: "top"
  },
  // Chặng 6: Xuất hóa đơn đầu tiên (Target: /invoices)
  {
    id: "6.1",
    stage: 6,
    subStep: 1,
    selector: "#btn-generate-monthly-invoice",
    title: "Xuất hóa đơn hàng tháng",
    description: "Cuối tháng, bác chỉ cần bấm vào nút này để hệ thống tự động tính toán tiền phòng + tiền điện nước ra hóa đơn cho bác!",
    targetPath: "/invoices",
    position: "bottom"
  },
  {
    id: "6.2",
    stage: 6,
    subStep: 2,
    selector: "#btn-preview-qr-invoice",
    title: "Xem mã QR hóa đơn",
    description: "Hóa đơn đã ra! Bác bấm vào đây để xem mã QR thanh toán có gắn sẵn cú pháp tự động gạch nợ nhé!",
    targetPath: "/invoices",
    position: "left"
  }
];

interface PageGuide {
  title: string;
  tips: string[];
}

export const PAGE_GUIDES: Record<string, PageGuide> = {
  "/dashboard": {
    title: "Trang Tổng quan",
    tips: [
      "Xem nhanh các chỉ số doanh thu dự kiến, số tiền đã thu thực tế và công nợ của tất cả khu trọ.",
      "Tỷ lệ lấp đầy hiển thị phần trăm số phòng có khách thuê thực tế trên tổng số phòng.",
      "Phần 'Cần xử lý' nhắc bác các công việc cần làm ngay như hóa đơn quá hạn hoặc chỉ số điện nước chưa duyệt."
    ]
  },
  "/motels": {
    title: "Trang Quản lý Khu trọ",
    tips: [
      "Nhấp 'Thêm khu trọ' để tạo mới một tòa nhà hoặc phân khu trọ.",
      "Nhấp 'Chi tiết' trên từng khu trọ để cấu hình phòng, quản lý các dịch vụ đi kèm riêng (như tiền rác, xe, wifi) hoặc thiết lập VietQR SePay.",
      "Để thiết lập thanh toán tự động, chọn 'Cài đặt ngân hàng' trên khu trọ và làm theo hướng dẫn sao chép URL + Secret Key."
    ]
  },
  "/services": {
    title: "Trang Cấu hình Dịch vụ",
    tips: [
      "Khai báo các dịch vụ dùng chung trong hệ thống như phí rác, gửi xe, phí quản lý, internet.",
      "Có 2 hình thức tính phí: cố định (theo phòng, theo người) và theo chỉ số tiêu thụ (như điện, nước).",
      "Khi thêm phòng trọ, các dịch vụ bắt buộc sẽ được tự động áp dụng."
    ]
  },
  "/residents": {
    title: "Trang Quản lý Khách thuê",
    tips: [
      "Danh sách tất cả khách đang thuê trọ hoặc đã chuyển đi.",
      "Bác có thể cập nhật thông tin cá nhân, số điện thoại liên lạc hoặc số CCCD/CMND của khách thuê.",
      "Khách thuê có tài khoản có thể tự đăng nhập xem hóa đơn và số dư của họ."
    ]
  },
  "/contracts": {
    title: "Trang Hợp đồng cho thuê",
    tips: [
      "Hợp đồng là căn cứ pháp lý liên kết khách thuê vào một phòng trọ cụ thể.",
      "Bác có thể thiết lập tiền đặt cọc phòng, giá thuê phòng thực tế và các điều khoản phụ lục.",
      "Hệ thống sẽ tự động cảnh báo trước 30 ngày đối với các hợp đồng chuẩn bị hết hạn để bác làm thủ tục gia hạn."
    ]
  },
  "/meter": {
    title: "Trang Chỉ số Điện nước",
    tips: [
      "Nơi nhập chỉ số điện nước (số mới) vào ngày chốt kỳ hóa đơn hàng tháng.",
      "Sau khi nhập, bác cần bấm 'Duyệt chỉ số' để hệ thống tự động lập hóa đơn tương ứng gửi cho khách thuê.",
      "Lịch sử ghi số giúp bác đối chiếu mức tiêu thụ giữa các tháng dễ dàng."
    ]
  },
  "/invoices": {
    title: "Trang Hóa đơn thu tiền",
    tips: [
      "Quản lý hóa đơn thanh toán hàng tháng của các phòng trọ.",
      "Mỗi hóa đơn đều đi kèm một mã VietQR động chứa sẵn số tiền và nội dung chuyển khoản mã hóa.",
      "Khi khách quét mã QR để chuyển tiền, SePay sẽ phát tín hiệu webhook giúp hệ thống tự động gạch nợ hóa đơn chỉ sau 3 giây!"
    ]
  },
  "/reports": {
    title: "Trang Báo cáo tài chính",
    tips: [
      "Theo dõi doanh thu thực thu, dòng tiền chênh lệch và dư nợ chưa thu hồi theo từng tháng/quý/năm.",
      "Biểu đồ trực quan giúp bác chủ trọ có cái nhìn tổng quát về hiệu quả kinh doanh của từng khu trọ.",
      "Xuất file Excel báo cáo để lưu trữ ngoại tuyến khi cần thiết."
    ]
  },
  "/settings": {
    title: "Trang Cài đặt hệ thống",
    tips: [
      "Thay đổi thông tin tài khoản cá nhân, mật khẩu đăng nhập.",
      "Quản lý thông tin Tenant (thương hiệu nhà trọ của bác) và phân quyền truy cập cho nhân viên quản lý phụ việc."
    ]
  }
};

interface TourGuideContextType {
  onboardingStatus: OnboardingStatusResult | null;
  loading: boolean;
  currentStep: number;
  activeStepData: TourStep | null;
  hasCompletedOnboarding: boolean;
  refreshStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  isGuideOpen: boolean;
  setIsGuideOpen: (open: boolean) => void;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
  pageGuide: PageGuide | null;
  activeSubStepId: string;
  setActiveSubStepId: (id: string) => void;
  isDriverActive: boolean;
  localOverrideStep: number | null;
  setLocalOverrideStep: (step: number | null) => void;
}

const TourGuideContext = createContext<TourGuideContextType | undefined>(undefined);

export function TourGuideProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeStepData, setActiveStepData] = useState<TourStep | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isDriverActive, setIsDriverActive] = useState(false);
  const [localOverrideStep, setLocalOverrideStep] = useState<number | null>(null);

  const activeStepNumber = localOverrideStep !== null ? localOverrideStep : currentStep;

  // Clear override when currentStep advances
  useEffect(() => {
    setLocalOverrideStep(null);
  }, [currentStep]);

  useEffect(() => {
    if (activeStepNumber >= 1 && activeStepNumber <= 6) {
      setActiveStepData(ONBOARDING_STEPS[activeStepNumber - 1]);
    } else {
      setActiveStepData(null);
    }
  }, [activeStepNumber]);

  const [activeSubStepId, setActiveSubStepId] = useState<string>(() => {
    return localStorage.getItem("onboarding_substep") || "1.1";
  });

  const driverInstanceRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);

  // Check if role is eligible for tour (only managers/admins)
  const isEligible = user && (user.role === "MANAGER" || user.role === "ADMIN");

  const refreshStatus = useCallback(async () => {
    if (!isEligible) return;
    setLoading(true);
    try {
      const status = await authService.getOnboardingStatus();
      setOnboardingStatus(status);

      const step = status.currentStep || 1;
      setCurrentStep(step);
      
      if (step >= 1 && step <= 6) {
        // Handled by activeStepNumber useEffect
      } else {
        setActiveStepData(null);
      }

      // Check if user has just completed onboarding during this session
      if (status.hasInvoice && !status.hasCompletedOnboarding) {
        setShowCelebration(true);
      }

      // Sync user profile state if mismatch
      if (status.hasCompletedOnboarding !== user.hasCompletedOnboarding) {
        setUser({
          ...user,
          hasCompletedOnboarding: status.hasCompletedOnboarding,
        });
      }
    } catch (err) {
      console.error("Failed to load onboarding status", err);
    } finally {
      setLoading(false);
    }
  }, [isEligible, user, setUser]);

  const completeOnboarding = async () => {
    if (!isEligible) return;
    try {
      await authService.completeOnboarding();
      if (user) {
        setUser({
          ...user,
          hasCompletedOnboarding: true,
        });
      }
      if (onboardingStatus) {
        setOnboardingStatus({
          ...onboardingStatus,
          hasCompletedOnboarding: true,
        });
      }
      setCurrentStep(7);
      setActiveStepData(null);
      setShowCelebration(true);
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    }
  };

  // Sync sub-step to the current stage derived from backend
  useEffect(() => {
    if (activeStepNumber >= 1 && activeStepNumber <= 6) {
      const expectedPrefix = `${activeStepNumber}.`;
      if (!activeSubStepId.startsWith(expectedPrefix)) {
        const firstSubStep = SUB_STEPS.find(s => s.stage === activeStepNumber);
        if (firstSubStep) {
          setActiveSubStepId(firstSubStep.id);
          localStorage.setItem("onboarding_substep", firstSubStep.id);
        }
      }
    }
  }, [activeStepNumber, activeSubStepId]);

  const advanceSubStep = useCallback(() => {
    const currentIndex = SUB_STEPS.findIndex(s => s.id === activeSubStepId);
    if (currentIndex !== -1 && currentIndex < SUB_STEPS.length - 1) {
      const nextStep = SUB_STEPS[currentIndex + 1];
      if (nextStep.stage === activeStepNumber) {
        setActiveSubStepId(nextStep.id);
        localStorage.setItem("onboarding_substep", nextStep.id);
      }
    }
  }, [activeSubStepId, activeStepNumber]);

  const regressSubStep = useCallback(() => {
    const currentIndex = SUB_STEPS.findIndex(s => s.id === activeSubStepId);
    if (currentIndex > 0) {
      const prevStep = SUB_STEPS[currentIndex - 1];
      if (prevStep.stage === activeStepNumber) {
        setActiveSubStepId(prevStep.id);
        localStorage.setItem("onboarding_substep", prevStep.id);
      }
    }
  }, [activeSubStepId, activeStepNumber]);

  // Main active driver.js loop
  useEffect(() => {
    const hasCompletedOnboardingVal = onboardingStatus?.hasCompletedOnboarding ?? user?.hasCompletedOnboarding ?? false;
    
    if ((hasCompletedOnboardingVal && localOverrideStep === null) || !isGuideOpen || activeStepNumber < 1 || activeStepNumber > 6) {
      if (driverInstanceRef.current) {
        isTransitioningRef.current = true;
        driverInstanceRef.current.destroy();
        driverInstanceRef.current = null;
        isTransitioningRef.current = false;
      }
      return;
    }

    const interval = setInterval(() => {
      const activeStep = SUB_STEPS.find(s => s.id === activeSubStepId);
      if (!activeStep) return;

      // 1. Auto-advance transitions based on visibility of elements belonging to next step
      if (activeSubStepId === "1.1" && document.querySelector("#input-motel-name")) {
        setActiveSubStepId("1.2");
        localStorage.setItem("onboarding_substep", "1.2");
        return;
      }
      if (activeSubStepId === "2.1" && document.querySelector("#btn-copy-webhook-url")) {
        setActiveSubStepId("2.2");
        localStorage.setItem("onboarding_substep", "2.2");
        return;
      }
      if (activeSubStepId === "3.1" && document.querySelector("#input-bulk-quantity")) {
        setActiveSubStepId("3.2");
        localStorage.setItem("onboarding_substep", "3.2");
        return;
      }
      if (activeSubStepId === "4.1" && document.querySelector("#select-contract-room")) {
        setActiveSubStepId("4.2");
        localStorage.setItem("onboarding_substep", "4.2");
        return;
      }
      if (activeSubStepId === "5.1" && document.querySelector("#input-electric-index-initial")) {
        setActiveSubStepId("5.2");
        localStorage.setItem("onboarding_substep", "5.2");
        return;
      }

      // 2. Auto-routing: if user is on the wrong route, navigate or wait
      const isWrongRoute = location.pathname !== activeStep.targetPath;
      if (isWrongRoute) {
        if (driverInstanceRef.current) {
          isTransitioningRef.current = true;
          driverInstanceRef.current.destroy();
          driverInstanceRef.current = null;
          isTransitioningRef.current = false;
        }
        return;
      }

      // 3. Find target element
      const targetElement = document.querySelector(activeStep.selector);
      if (!targetElement) {
        // Safe retry/waiting when element is not rendered yet
        if (driverInstanceRef.current) {
          isTransitioningRef.current = true;
          driverInstanceRef.current.destroy();
          driverInstanceRef.current = null;
          isTransitioningRef.current = false;
        }
        return;
      }

      // Check if target is actually visible
      const rect = targetElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (driverInstanceRef.current) {
          isTransitioningRef.current = true;
          driverInstanceRef.current.destroy();
          driverInstanceRef.current = null;
          isTransitioningRef.current = false;
        }
        return;
      }

      // Check if driver is already highlighting this element
      const isAlreadyHighlighting = driverInstanceRef.current && 
        driverInstanceRef.current.isActive() &&
        driverInstanceRef.current.getActiveElement() === targetElement;

      if (isAlreadyHighlighting) {
        return; 
      }

      // Create and launch driver.js
      if (driverInstanceRef.current) {
        isTransitioningRef.current = true;
        driverInstanceRef.current.destroy();
        isTransitioningRef.current = false;
      }

      const stageSteps = SUB_STEPS.filter(s => s.stage === activeStepNumber);
      const activeIndex = stageSteps.findIndex(s => s.id === activeSubStepId);
      const isFirst = activeIndex === 0;
      const isLast = activeIndex === stageSteps.length - 1;

      const buttons: ("next" | "previous" | "close")[] = [];
      if (!isFirst) buttons.push("previous");
      if (!isLast) buttons.push("next");

      const d = driver({
        allowClose: true,
        overlayColor: "rgba(15, 23, 42, 0.7)",
        stagePadding: 6,
        stageRadius: 12,
        showProgress: false,
        showButtons: buttons,
        popoverClass: "driverjs-theme-custom font-sans",
        onNextClick: () => {
          advanceSubStep();
        },
        onPrevClick: () => {
          regressSubStep();
        },
        onDestroyed: () => {
          setIsDriverActive(false);
          if (!isTransitioningRef.current) {
            setIsGuideOpen(false);
          }
        }
      });

      d.highlight({
        element: activeStep.selector,
        popover: {
          title: `Chặng ${activeStepNumber}.${activeStep.subStep}: ${activeStep.title}`,
          description: activeStep.description,
          side: activeStep.position || "bottom",
          align: "start",
          nextBtnText: "Tiếp tục →",
          prevBtnText: "← Quay lại"
        }
      });

      setIsDriverActive(true);
      driverInstanceRef.current = d;
    }, 400);

    return () => {
      clearInterval(interval);
      if (driverInstanceRef.current) {
        isTransitioningRef.current = true;
        driverInstanceRef.current.destroy();
        driverInstanceRef.current = null;
        isTransitioningRef.current = false;
      }
      setIsDriverActive(false);
    };
  }, [onboardingStatus, user, isGuideOpen, activeStepNumber, activeSubStepId, location.pathname, advanceSubStep, regressSubStep]);

  useEffect(() => {
    if (isEligible) {
      refreshStatus();
    }
  }, [location.pathname]);

  const pageGuide = PAGE_GUIDES[location.pathname] || null;
  const hasCompletedOnboarding = onboardingStatus?.hasCompletedOnboarding ?? user?.hasCompletedOnboarding ?? false;

  return (
    <TourGuideContext.Provider
      value={{
        onboardingStatus,
        loading,
        currentStep,
        activeStepData,
        hasCompletedOnboarding,
        refreshStatus,
        completeOnboarding,
        isGuideOpen,
        setIsGuideOpen,
        showCelebration,
        setShowCelebration,
        pageGuide,
        activeSubStepId,
        setActiveSubStepId,
        isDriverActive,
        localOverrideStep,
        setLocalOverrideStep
      }}
    >
      {children}
    </TourGuideContext.Provider>
  );
}

export function useTourGuide() {
  const context = useContext(TourGuideContext);
  if (context === undefined) {
    throw new Error("useTourGuide must be used within a TourGuideProvider");
  }
  return context;
}
