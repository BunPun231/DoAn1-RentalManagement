import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService, type OnboardingStatusResult } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";

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
}

const TourGuideContext = createContext<TourGuideContextType | undefined>(undefined);

export function TourGuideProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeStepData, setActiveStepData] = useState<TourStep | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if role is eligible for tour (only managers/admins)
  const isEligible = user && (user.role === "MANAGER" || user.role === "ADMIN");

  const refreshStatus = useCallback(async () => {
    if (!isEligible) return;
    setLoading(true);
    try {
      const status = await authService.getOnboardingStatus();
      setOnboardingStatus(status);

      // Determine step number (1-6)
      let step = 1;
      if (!status.hasMotel) {
        step = 1;
      } else if (!status.hasSePayConfig) {
        step = 2;
      } else if (!status.hasRooms) {
        step = 3;
      } else if (!status.hasActiveContract) {
        step = 4;
      } else if (!status.hasMeterReadings) {
        step = 5;
      } else if (!status.hasInvoice) {
        step = 6;
      } else {
        step = 7; // Completed
      }

      setCurrentStep(step);
      if (step >= 1 && step <= 6) {
        setActiveStepData(ONBOARDING_STEPS[step - 1]);
      } else {
        setActiveStepData(null);
      }

      // Check if user has just completed onboarding during this session
      if (status.hasInvoice && !status.hasCompletedOnboarding) {
        // Auto trigger celebration on client
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

  useEffect(() => {
    if (isEligible) {
      refreshStatus();
    }
  }, [location.pathname]); // Refresh on route changes

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
