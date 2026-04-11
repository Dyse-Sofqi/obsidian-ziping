def test_shishen_algorithms():
    # 天干列表
    ctg = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    
    # paipan.js算法
    def paipan_js_calculate(day_gan_index, target_gan_index):
        diff = (target_gan_index - day_gan_index + 10) % 10
        shishen_types = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']
        return shishen_types[(diff + 10) % 10]
    
    # Paipan.ts算法
    def paipan_ts_calculate(day_gan_index, target_gan_index):
        dgs = [
            [2, 3, 1, 0, 9, 8, 7, 6, 5, 4],  # 甲
            [3, 2, 0, 1, 8, 9, 6, 7, 4, 5],  # 乙
            [5, 4, 2, 3, 1, 0, 9, 8, 7, 6],  # 丙
            [4, 5, 3, 2, 0, 1, 8, 9, 6, 7],  # 丁
            [7, 6, 5, 4, 2, 3, 1, 0, 9, 8],  # 戊
            [6, 7, 4, 5, 3, 2, 0, 1, 8, 9],  # 己
            [9, 8, 7, 6, 5, 4, 2, 3, 1, 0],  # 庚
            [8, 9, 6, 7, 4, 5, 3, 2, 0, 1],  # 辛
            [1, 0, 9, 8, 7, 6, 5, 4, 2, 3],  # 壬
            [0, 1, 8, 9, 6, 7, 4, 5, 3, 2]   # 癸
        ]
        sss_full = ['伤官', '食神', '比肩', '劫财', '正印', '偏印', '正官', '偏官', '正财', '偏财']
        return sss_full[dgs[day_gan_index][target_gan_index]]

    # 正确算法（甲为例）
    def correct_calculate(day_gan_index, target_gan_index):
        # 传统算法：根据五行生克和阴阳关系
        diff = (target_gan_index - day_gan_index) % 10
        
        if diff == 0:  # 同我
            if day_gan_index % 2 == target_gan_index % 2:  # 同阴阳
                return '比肩'
            else:  # 异阴阳
                return '劫财'
        elif diff == 1:  # 生我
            if day_gan_index % 2 == target_gan_index % 2:
                return '偏印'
            else:
                return '正印'
        elif diff == 2:  # 我生
            if day_gan_index % 2 == target_gan_index % 2:
                return '食神'
            else:
                return '伤官'
        elif diff == 3:  # 克我
            if day_gan_index % 2 == target_gan_index % 2:
                return '偏官'
            else:
                return '正官'
        elif diff == 4:  # 我克
            if day_gan_index % 2 == target_gan_index % 2:
                return '偏财'
            else:
                return '正财'
        else:  # 相隔超过4位，按周期关系
            # 5为同阴阳对应，6为异阴阳对应，以此类推
            cycle_diff = diff - 4
            if cycle_diff == 1:  # 相隔5位
                if day_gan_index % 2 == target_gan_index % 2:
                    return '比肩'
                else:
                    return '劫财'
            elif cycle_diff == 2:  # 相隔6位
                if day_gan_index % 2 == target_gan_index % 2:
                    return '偏印'
                else:
                    return '正印'
            elif cycle_diff == 3:  # 相隔7位
                if day_gan_index % 2 == target_gan_index % 2:
                    return '食神'
                else:
                    return '伤官'
            elif cycle_diff == 4:  # 相隔8位
                if day_gan_index % 2 == target_gan_index % 2:
                    return '偏官'
                else:
                    return '正官'
            elif cycle_diff == 5:  # 相隔9位
                if day_gan_index % 2 == target_gan_index % 2:
                    return '偏财'
                else:
                    return '正财'

    # 测试所有组合
    test_cases = [
        (0, 0, '比肩'),  # 甲-甲
        (0, 1, '劫财'),  # 甲-乙
        (0, 2, '偏印'),  # 甲-丙
        (0, 3, '正印'),  # 甲-丁
        (0, 4, '偏官'),  # 甲-戊
        (0, 5, '正官'),  # 甲-己
        (0, 6, '偏财'),  # 甲-庚
        (0, 7, '正财'),  # 甲-辛
        (0, 8, '食神'),  # 甲-壬
        (0, 9, '伤官'),  # 甲-癸
    ]

    print("十神算法对比测试（以甲日干为例）:")
    print("=" * 50)
    
    error_count = 0
    for day_idx, target_idx, expected in test_cases:
        js_result = paipan_js_calculate(day_idx, target_idx)
        ts_result = paipan_ts_calculate(day_idx, target_idx)
        correct_result = correct_calculate(day_idx, target_idx)
        
        js_correct = js_result == expected
        ts_correct = ts_result == expected
        
        print(f"{ctg[day_idx]}对{ctg[target_idx]}:")
        print(f"  正确结果: {expected}")
        print(f"  paipan.js: {js_result} {'✓' if js_correct else '✗'}")
        print(f"  Paipan.ts: {ts_result} {'✓' if ts_correct else '✗'}")
        
        if not js_correct:
            error_count += 1
        if not ts_correct:
            error_count += 1
            
        print()
    
    print(f"总计错误数量: {error_count}")
    
    # 特别显示不一致的算法
    print("\n算法不一致的特别案例:")
    print("-" * 30)
    for day_idx in range(10):
        for target_idx in range(10):
            js_result = paipan_js_calculate(day_idx, target_idx)
            ts_result = paipan_ts_calculate(day_idx, target_idx)
            if js_result != ts_result:
                print(f"{ctg[day_idx]}对{ctg[target_idx]}: paipan.js={js_result}, Paipan.ts={ts_result}")

test_shishen_algorithms()