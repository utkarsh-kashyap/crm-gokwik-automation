Feature: Merchant Login

  Background:
    Given I am on the login page

  @smoke @auth
  Scenario: Merchant logs in successfully with valid credentials and OTP
    When I enter my email and click Next
    And I enter my password and click Next
    And I enter the OTP and click Next
    Then I should be redirected to the dashboard

  @regression @auth @negative
  Scenario: Next button is disabled before entering email
    Then the Next button should be disabled

  @regression @auth @negative
  Scenario: Wrong OTP keeps user on OTP screen
    When I enter my email and click Next
    And I enter my password and click Next
    And I enter an incorrect OTP "000000" and click Next
    Then I should remain on the OTP screen
